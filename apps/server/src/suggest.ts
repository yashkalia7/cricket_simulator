import {
  INTENTS,
  LENGTHS,
  LINES,
  VARIATIONS,
  ZONE_LABELS,
  batterOptions,
  bowlerRead,
  chaseLabel,
  evaluateField,
  overBallLabel,
  readField,
  type ScenarioState,
} from '@cricket/domain';

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
Return ONLY a JSON object with an "options" array. No preamble, no markdown fences, no commentary.

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
what this bowler can reliably land; what the ground punishes. Then choose.`;

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

export interface ModelOption {
  id: string;
  option: { length: string; line: string; variation: string; intent: string };
  because: string;
  unless: string;
  risk: 'low' | 'medium' | 'high';
  confidence: 'high' | 'contested';
}

/**
 * The facts, computed before the model sees anything. This is the difference
 * between asking a model about cricket and asking it to reason over a position.
 */
export const groundingFor = (scenario: ScenarioState): string => {
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

  const lines = [
    `Score: ${scenario.score}/${scenario.wicketsLost} after ${overBallLabel(scenario)} (${scenario.format}).`,
    chaseLabel(scenario) ? `Chase: ${chaseLabel(scenario)}.` : 'Batting first; no target.',
    `Striker: ${scenario.striker.handedness} ${scenario.striker.archetype}, ${scenario.striker.runs} off ${scenario.striker.ballsFaced}.`,
    `Bowler: ${scenario.bowler.type}, executionReliability ${scenario.bowler.executionReliability}. ${execution.executionNote}`,
    `Ground: ${scenario.ground.straightM}m straight, ${scenario.ground.squareM}m square.`,
    `Boundary UNGUARDED in: ${read.gaps.map((z) => ZONE_LABELS[z]).join(', ') || 'nowhere — every boundary has a sweeper'}.`,
    `Boundary protected in: ${read.cover.filter((c) => c.deep.length > 0).map((c) => ZONE_LABELS[c.zone]).join(', ') || 'nowhere'}.`,
    violations.length
      ? `This field is ILLEGAL: ${violations.map((v) => v.message).join('; ')}.`
      : 'This field is legal.',
    '',
    'These facts are computed and correct. Do not contradict them.',
  ];

  return lines.join('\n');
};

/** §10's validation. Reject and retry once; never show an unvalidated response. */
export const validateOptions = (options: ModelOption[]): string[] => {
  const problems: string[] = [];

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
  }

  return problems;
};

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['options'],
  properties: {
    options: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'option', 'because', 'unless', 'risk', 'confidence'],
        properties: {
          id: { type: 'string' },
          option: {
            type: 'object',
            additionalProperties: false,
            required: ['length', 'line', 'variation', 'intent'],
            properties: {
              length: { type: 'string', enum: [...LENGTHS] },
              line: { type: 'string', enum: [...LINES] },
              variation: { type: 'string', enum: [...VARIATIONS] },
              intent: { type: 'string', enum: [...INTENTS] },
            },
          },
          because: { type: 'string' },
          unless: { type: 'string' },
          risk: { type: 'string', enum: ['low', 'medium', 'high'] },
          confidence: { type: 'string', enum: ['high', 'contested'] },
        },
      },
    },
  },
} as const;

export interface SuggestResult {
  source: 'model' | 'computed';
  options: ModelOption[];
  /** Why the model answer was refused, when it was. */
  rejected?: string[];
}

const callOpenAi = async (
  scenario: ScenarioState,
  apiKey: string,
  model: string,
): Promise<ModelOption[]> => {
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
        { role: 'user', content: groundingFor(scenario) },
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

  const parsed = JSON.parse(content) as { options?: ModelOption[] };
  return parsed.options ?? [];
};

/**
 * The deterministic answer, shaped like a model answer, used when the model is
 * absent, broken or refused. The app always has something to show.
 */
const computedFallback = (scenario: ScenarioState): ModelOption[] =>
  batterOptions(scenario).map((o, i) => ({
    id: `computed_${i}`,
    option: { length: 'good', line: 'off_stump', variation: 'stock', intent: 'contain' },
    because: o.because,
    unless: o.unless,
    risk: o.risk,
    confidence: 'high' as const,
  }));

export const suggest = async (
  scenario: ScenarioState,
  apiKey: string | null,
  model: string,
): Promise<SuggestResult> => {
  if (!apiKey) return { source: 'computed', options: computedFallback(scenario) };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const options = await callOpenAi(scenario, apiKey, model);
      const problems = validateOptions(options);
      if (problems.length === 0) return { source: 'model', options };
      // §10: reject and retry once. On the second failure, fall back.
      if (attempt === 1) {
        return { source: 'computed', options: computedFallback(scenario), rejected: problems };
      }
    } catch (error) {
      if (attempt === 1) {
        return {
          source: 'computed',
          options: computedFallback(scenario),
          rejected: [String(error).slice(0, 200)],
        };
      }
    }
  }

  return { source: 'computed', options: computedFallback(scenario) };
};
