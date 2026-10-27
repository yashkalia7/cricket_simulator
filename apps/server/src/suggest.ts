import {
  INTENTS,
  LENGTHS,
  LENGTH_LABELS,
  LINES,
  LINE_LABELS,
  PHASE_LABELS,
  SCORING_ZONES,
  VARIATIONS,
  VARIATION_LABELS,
  ZONE_LABELS,
  batterOptions,
  bowlerRead,
  chaseLabel,
  evaluateField,
  isPositionId,
  overBallLabel,
  phase,
  positionById,
  readField,
  type PositionId,
  type ScenarioState,
  type ScoringZone,
} from '@cricket/domain';

const labelOf = (id: PositionId): string => positionById(id).label.toLowerCase();

/**
 * The model layer (BUILD.md §10).
 *
 * Three things keep this honest:
 *
 * 1. **Grounding.** The deterministic engine has already computed which
 *    boundaries are unguarded, whether the field is legal and what this bowler
 *    can land. Those facts go in as given, so the model is reasoning over
 *    verified cricket rather than inventing geometry.
 * 2. **Schema.** OpenAI structured outputs, so the shape cannot drift.
 * 3. **Validation.** §10's rejection rules run server-side before anything is
 *    returned, and a failure falls back to the computed options rather than
 *    showing an unvalidated answer.
 */

/** §10's system prompt, used verbatim. Every constraint exists for a reason. */
const SYSTEM_PROMPT = `You are a cricket tactics assistant inside a decision-training tool. Coaches and serious
players use it. Your output is displayed as options for the user to choose between — you
are never the answer.

RETURN FORMAT
Return ONLY a JSON object. No preamble, no markdown fences, no commentary. It has four
parts and all four are required: theRead, onYourCall, options, overPlan.

LENGTH
Write like a coach talking a bowler through an over, not like a caption. theRead and
overPlan are three to five sentences each. Every "because" is two to four sentences.
Thin answers are the failure mode here — if you find yourself with one short sentence,
you have not finished the thought. Never pad: add reasoning, not words.

HARD RULES

1. Return 2 or 3 options. Never 1. They must lead to genuinely different outcomes, not the
   same ball described two ways. If you cannot find a second real option, return one option
   with confidence "contested" and say in "unless" why the alternatives are worse.

2. "unless" is mandatory and must be specific. State the concrete condition under which THIS
   option fails. "Unless he executes badly" is not acceptable — say what the miss becomes and
   where it goes. If you cannot name a specific failure mode, the option is not well enough
   understood to suggest.

3. Never state numbers. No expected runs, no percentages, no strike rates, no "8 times out of
   10", no averages. You have no basis for any figure. Qualitative reasoning only.

4. Use the bowler's executionReliability. Below 50, options requiring precision (yorker,
   wide_yorker) must carry risk "high" and an "unless" naming what the miss becomes. Above 75,
   precision options become viable that otherwise would not be.

5. Use the ground dimensions. A short square boundary changes which side you can afford to
   miss on. Say so when it drives the call.

6. Respect the field that is set. Do not suggest a line the field does not protect without
   including the fieldChange that fixes it.

7. Banned phrasing: "bowl to your field", "hard lengths", "take pace off", "back of a length
   into the pitch", "mix it up", "keep it simple", "execute your skills", "channel outside
   off". These are commentary filler. Say the specific thing instead.

8. If the scenario is genuinely ambiguous — several options equally defensible — mark all of
   them "contested". This is a valid and useful answer. Do not manufacture a favourite.

REASONING FRAME
Work through, in order: what the batter is trying to do; what the field currently permits;
what this bowler can reliably land; what the ground punishes. Then choose.

--- EXTENSION (not part of BUILD.md section 10; see docs/DECISIONS.md D-008) ---

A. First, answer the user's own call in "onYourCall". They have already
   committed — this is the part they actually want. Say what their delivery
   does in THIS situation against THIS batter with THIS field: what it invites,
   where it goes when it lands, and where it goes when it does not. Then
   "sharpen": the one adjustment that most improves it, or the one thing to
   watch for. Do not grade it out of ten and do not simply praise it.

B. "because" may run to two sentences when the reasoning genuinely needs it.
   Do not pad. A second sentence that repeats the first is worse than one.

C. Each option may carry "fieldChanges": moves that make that ball work. Use
   only the fielders named in the situation, and the actions push_back,
   bring_up, finer or squarer. Leave it empty if the field already suits.

D. Use the recent balls. A batter who has just hit two boundaries in three is
   a different problem from one who has played out three dots, and the sequence
   is given to you. Refer to what actually happened.

E. GROUND EVERY ANSWER IN THIS POSITION. Each option, and onYourCall, must name
   at least one thing that is true of THIS scenario and would be absent from a
   textbook answer: a fielder by the name given, the dew, the short boundary,
   the ball's condition, the batter's type, or a specific delivery from the
   recent sequence. An option that names none of these is rejected and you will
   be asked again.

   Too generic — rejected:
     "A good length on the fourth stump makes it difficult for the batter to
      commit to a big shot while still containing runs."
     Nothing there is about this match. It would be equally true anywhere.

   Specific — accepted:
     "Point is empty and short cover is saving one, so the cut is the free shot
      and he has already taken a six off the leg stump this over. Going wider
      moves the ball away from the arc he just used."

F. Write for a coach who wants the reasoning, not a slogan. Do not restate the
   delivery you just named — explain what it does to THIS batter, in THIS over,
   against THIS field.

G. The four parts do different jobs. Do not repeat yourself across them.

   theRead.batterIntent      — what he is trying to do right now and why, read
                               from his type, his score, and the balls he has
                               just played. Where is he looking to hit?
   theRead.bowlerLeverage    — what this particular bowler actually has to work
                               with here: pace, the variations his type can
                               bowl, and what his execution number permits.
   theRead.groundAndConditions — what the ground and the conditions punish and
                               reward tonight. Which side is the cheap miss?

   onYourCall.reading        — what the user's ball does in this exact position.
   onYourCall.whenItLands    — the good outcome, concretely: where it goes and
                               what it costs.
   onYourCall.whenItMisses   — the bad outcome, concretely: what the miss turns
                               into and which part of the ground it finds.
   onYourCall.sharpen        — the single adjustment that most improves it.

   option.howTheOverDevelops — what this ball sets up. A ball is rarely a plan
                               on its own; say what you bowl next if it works
                               and what you bowl next if it does not.

   overPlan                  — how you would sequence the balls that remain,
                               given the match situation. Name the balls.`;

const BANNED = [
  'bowl to your field',
  'hard lengths',
  'take pace off',
  'back of a length into the pitch',
  'mix it up',
  'keep it simple',
  'execute your skills',
  'channel outside off',
];

export interface FieldChange {
  position: string;
  action: 'push_back' | 'bring_up' | 'finer' | 'squarer';
}

export interface ModelOption {
  id: string;
  option: {
    length: string;
    line: string;
    variation: string;
    intent: string;
    fieldChanges?: FieldChange[];
  };
  because: string;
  unless: string;
  howTheOverDevelops: string;
  risk: 'low' | 'medium' | 'high';
  confidence: 'high' | 'contested';
}

/** The position, before any option is offered. */
export interface TheRead {
  batterIntent: string;
  bowlerLeverage: string;
  groundAndConditions: string;
}

/** The model's read of the decision the user actually committed to. */
export interface OnYourCall {
  reading: string;
  whenItLands: string;
  whenItMisses: string;
  sharpen: string;
  risk: 'low' | 'medium' | 'high';
}

/**
 * The facts, computed before the model sees anything. This is the difference
 * between asking a model about cricket and asking it to reason over a position.
 */
export const groundingFor = (scenario: ScenarioState, decision: unknown): string => {
  const read = readField(scenario.field);
  const execution = bowlerRead(scenario);
  const violations = evaluateField(
    {
      format: scenario.format,
      over: scenario.over,
      strikerHandedness: scenario.striker.handedness,
      superOver: scenario.superOver,
    },
    scenario.field,
  );

  /** Named, with depth — "deep square leg is back" beats "square leg is covered". */
  const describeZone = (zone: ScoringZone): string => {
    const cover = read.cover.find((c) => c.zone === zone);
    if (!cover) return `${ZONE_LABELS[zone]}: nobody`;
    const parts: string[] = [];
    if (cover.deep.length) parts.push(`${cover.deep.map(labelOf).join(' and ')} on the rope`);
    if (cover.ring.length) parts.push(`${cover.ring.map(labelOf).join(' and ')} saving one`);
    if (cover.catching.length) parts.push(`${cover.catching.map(labelOf).join(' and ')} catching`);
    return `${ZONE_LABELS[zone]}: ${parts.join(', ') || 'EMPTY — no fielder at all'}`;
  };

  /** The last twelve balls. In a death over this is the most relevant fact there is. */
  const tape = scenario.lastDeliveries
    .map(
      (d) =>
        `${d.over}.${d.ball} ${LENGTH_LABELS[d.length]} ${LINE_LABELS[d.line]}` +
        `${d.variation === 'stock' ? '' : ` (${VARIATION_LABELS[d.variation]})`}` +
        ` -> ${d.wicket ? 'WICKET' : d.runs === 0 ? 'dot' : `${d.runs}`}`,
    )
    .join('\n  ');

  const lines = [
    'THE SITUATION',
    `${scenario.score}/${scenario.wicketsLost} after ${overBallLabel(scenario)}, ${scenario.format}, ${PHASE_LABELS[phase(scenario)]}.`,
    chaseLabel(scenario) ? `Chasing: ${chaseLabel(scenario)}.` : 'Batting first; no target to chase.',
    `Pitch ${scenario.pitch}, wear ${scenario.pitchWear === 0 ? 'none' : 'some'}, ball ${scenario.ballCondition} and ${Math.round(scenario.ballAgeOvers)} overs old.` +
      `${scenario.dew > 40 ? ' Heavy dew — the ball is skidding and hard to grip.' : ''}` +
      `${scenario.lights ? ' Under lights.' : ''}`,
    `Ground: ${scenario.ground.straightM}m straight, ${scenario.ground.squareM}m square.` +
      `${scenario.ground.squareM < 62 ? ' The square boundary is short.' : ''}`,
    '',
    'THE BATTER',
    `${scenario.striker.handedness} ${scenario.striker.archetype}, ${scenario.striker.runs} off ${scenario.striker.ballsFaced}.`,
    `Non-striker: ${scenario.nonStriker.handedness} ${scenario.nonStriker.archetype}.`,
    '',
    'THE BOWLER',
    `${scenario.bowler.type}, around ${scenario.bowler.avgSpeedKph}kph, executionReliability ${scenario.bowler.executionReliability}.`,
    execution.executionNote,
    '',
    'RECENT BALLS (oldest first)',
    tape ? `  ${tape}` : '  (none recorded)',
    '',
    'THE FIELD, ZONE BY ZONE',
    ...SCORING_ZONES.map((z) => `  ${describeZone(z)}`),
    '',
    `Boundary UNGUARDED in: ${read.gaps.map((z) => ZONE_LABELS[z]).join(', ') || 'nowhere — every boundary has a sweeper'}.`,
    violations.length
      ? `This field is ILLEGAL: ${violations.map((v) => v.message).join('; ')}.`
      : 'This field is legal.',
    '',
    'WHAT THE USER COMMITTED TO',
    decision ? JSON.stringify(decision) : '(nothing yet)',
    '',
    'Every fact above is computed and correct. Do not contradict any of it.',
    'Refer to fielders by the names given. Do not invent a fielder who is not listed.',
  ];

  return lines.join('\n');
};

/**
 * The specifics a generic answer would ignore (§12, item 3).
 *
 * "Would a coach disagree with it? If nobody could, it says nothing." An answer
 * that never names a fielder, a condition or what just happened is commentary,
 * however fluent — so an option that touches none of these is rejected and the
 * model is asked again.
 */
export const groundedTerms = (scenario: ScenarioState): string[] => {
  const terms: string[] = [];

  for (const fielder of scenario.field.fielders) {
    if (fielder.role === 'fielder') terms.push(labelOf(fielder.positionId));
  }
  for (const zone of SCORING_ZONES) terms.push(ZONE_LABELS[zone].toLowerCase());

  terms.push(scenario.striker.archetype, scenario.striker.handedness.toLowerCase());
  terms.push(scenario.bowler.type.replace(/_/g, ' '), scenario.bowler.type.replace(/_/g, '-'));
  terms.push(scenario.pitch, scenario.ballCondition);

  if (scenario.dew > 40) terms.push('dew', 'wet', 'slippery', 'skid');
  if (scenario.lights) terms.push('lights', 'night');
  if (scenario.ground.squareM < 62) terms.push('short square', 'square boundary', 'short boundary');
  if (scenario.bowler.executionReliability < 50) terms.push('execution', 'reliab', 'miss');
  if (scenario.lastDeliveries.some((d) => d.runs >= 6)) terms.push('six', 'maximum');
  if (scenario.lastDeliveries.some((d) => d.runs === 4)) terms.push('four', 'boundary');
  if (scenario.lastDeliveries.some((d) => d.wicket)) terms.push('wicket');
  if (scenario.target !== null) terms.push('chase', 'chasing', 'required', 'target');

  return [...new Set(terms.filter((t) => t.length > 2))];
};

/** §10's validation. Reject and retry once; never show an unvalidated response. */
export const validateOptions = (
  options: ModelOption[],
  scenario?: ScenarioState,
): string[] => {
  const problems: string[] = [];
  const grounded = scenario ? groundedTerms(scenario) : [];

  if (options.length < 2 && !options.every((o) => o.confidence === 'contested')) {
    problems.push('fewer than 2 options and not marked contested');
  }

  for (const o of options) {
    const text = `${o.because} ${o.unless}`.toLowerCase();

    if (o.unless.trim().split(/\s+/).length < 8) problems.push(`unless too short: "${o.unless}"`);
    if (/execut/.test(o.unless.toLowerCase()) && !/full toss|edge|short|wide|single|boundary/.test(o.unless.toLowerCase())) {
      problems.push('unless says "execut" without naming a consequence');
    }
    if (/\d\s*%/.test(text) || /\baverage\b/.test(text) || /strike rate/.test(text)) {
      problems.push('states a figure');
    }
    for (const phrase of BANNED) {
      if (text.includes(phrase)) problems.push(`banned phrase: "${phrase}"`);
    }

    // §12 item 3: it must engage with THIS position, not cricket in general.
    if (grounded.length > 0 && !grounded.some((term) => text.includes(term))) {
      problems.push(
        `option "${o.id}" names nothing specific to this scenario — no fielder, condition or recent ball`,
      );
    }

    if (!(LENGTHS as readonly string[]).includes(o.option.length)) {
      problems.push(`unknown length: ${o.option.length}`);
    }
    if (!(LINES as readonly string[]).includes(o.option.line)) {
      problems.push(`unknown line: ${o.option.line}`);
    }
    if (!(VARIATIONS as readonly string[]).includes(o.option.variation)) {
      problems.push(`unknown variation: ${o.option.variation}`);
    }
    if (!(INTENTS as readonly string[]).includes(o.option.intent)) {
      problems.push(`unknown intent: ${o.option.intent}`);
    }
    // A fielder the model invented would read as authoritative and be wrong.
    for (const change of o.option.fieldChanges ?? []) {
      if (!isPositionId(change.position)) {
        problems.push(`unknown fielding position: ${change.position}`);
      }
    }
  }

  return problems;
};

const FIELD_ACTIONS = ['push_back', 'bring_up', 'finer', 'squarer'] as const;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['theRead', 'onYourCall', 'options', 'overPlan'],
  properties: {
    theRead: {
      type: 'object',
      additionalProperties: false,
      required: ['batterIntent', 'bowlerLeverage', 'groundAndConditions'],
      properties: {
        batterIntent: { type: 'string' },
        bowlerLeverage: { type: 'string' },
        groundAndConditions: { type: 'string' },
      },
    },
    onYourCall: {
      type: 'object',
      additionalProperties: false,
      required: ['reading', 'whenItLands', 'whenItMisses', 'sharpen', 'risk'],
      properties: {
        reading: { type: 'string' },
        whenItLands: { type: 'string' },
        whenItMisses: { type: 'string' },
        sharpen: { type: 'string' },
        risk: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
    },
    overPlan: { type: 'string' },
    options: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'option',
          'because',
          'unless',
          'howTheOverDevelops',
          'risk',
          'confidence',
        ],
        properties: {
          id: { type: 'string' },
          option: {
            type: 'object',
            additionalProperties: false,
            required: ['length', 'line', 'variation', 'intent', 'fieldChanges'],
            properties: {
              length: { type: 'string', enum: [...LENGTHS] },
              line: { type: 'string', enum: [...LINES] },
              variation: { type: 'string', enum: [...VARIATIONS] },
              intent: { type: 'string', enum: [...INTENTS] },
              fieldChanges: {
                type: 'array',
                maxItems: 3,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['position', 'action'],
                  properties: {
                    position: { type: 'string' },
                    action: { type: 'string', enum: [...FIELD_ACTIONS] },
                  },
                },
              },
            },
          },
          because: { type: 'string' },
          unless: { type: 'string' },
          howTheOverDevelops: { type: 'string' },
          risk: { type: 'string', enum: ['low', 'medium', 'high'] },
          confidence: { type: 'string', enum: ['high', 'contested'] },
        },
      },
    },
  },
} as const;

export interface SuggestResult {
  source: 'model' | 'computed';
  theRead: TheRead | null;
  onYourCall: OnYourCall | null;
  overPlan: string | null;
  options: ModelOption[];
  /** Why the model answer was refused, when it was. */
  rejected?: string[];
}

const callOpenAi = async (
  scenario: ScenarioState,
  decision: unknown,
  apiKey: string,
  model: string,
): Promise<{
  theRead: TheRead | null;
  onYourCall: OnYourCall | null;
  overPlan: string | null;
  options: ModelOption[];
}> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: groundingFor(scenario, decision) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'suggestions', strict: true, schema: RESPONSE_SCHEMA },
      },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // Never echo the key, and never echo a provider body to the client.
    throw new Error(`openai ${response.status}: ${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('openai returned no content');

  const parsed = JSON.parse(content) as {
    options?: ModelOption[];
    onYourCall?: OnYourCall;
    theRead?: TheRead;
    overPlan?: string;
  };
  return {
    theRead: parsed.theRead ?? null,
    onYourCall: parsed.onYourCall ?? null,
    overPlan: parsed.overPlan ?? null,
    options: parsed.options ?? [],
  };
};

/**
 * The deterministic answer, shaped like a model answer, used when the model is
 * absent, broken or refused. The app always has something to show.
 */
const computedFallback = (scenario: ScenarioState): ModelOption[] => {
  return batterOptions(scenario).map((o, i) => ({
    id: `computed_${i}`,
    // The computed engine reasons about shots and gaps, not deliveries. Giving
    // every option the same hardcoded ball made three identical cards and read
    // as a broken model rather than as a deliberate fallback.
    option: {
      length: 'good',
      line: 'off_stump',
      variation: 'stock',
      intent: 'contain',
      fieldChanges: [],
    },
    because: o.because,
    unless: o.unless,
    howTheOverDevelops:
      'Computed from the field only — no sequencing advice without the model.',
    risk: o.risk,
    confidence: 'high' as const,
  }));
};

export const suggest = async (
  scenario: ScenarioState,
  decision: unknown,
  apiKey: string | null,
  model: string,
): Promise<SuggestResult> => {
  const fallback = (rejected?: string[]): SuggestResult => ({
    source: 'computed',
    theRead: null,
    onYourCall: null,
    overPlan: null,
    options: computedFallback(scenario),
    ...(rejected ? { rejected } : {}),
  });

  if (!apiKey) return fallback();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { theRead, onYourCall, overPlan, options } = await callOpenAi(
        scenario,
        decision,
        apiKey,
        model,
      );
      const problems = validateOptions(options, scenario);
      if (problems.length === 0) {
        return { source: 'model', theRead, onYourCall, overPlan, options };
      }
      // §10: reject and retry once. On the second failure, fall back.
      if (attempt === 1) return fallback(problems);
    } catch (error) {
      if (attempt === 1) return fallback([String(error).slice(0, 200)]);
    }
  }

  return fallback();
};
