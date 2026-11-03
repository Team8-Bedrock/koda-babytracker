const { GoogleGenAI, Type } = require('@google/genai');

const MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_INSIGHT = 'AI summaries are temporarily unavailable. Please try again later.';
const MINIMUM_LOGGED_DAYS = 3;
const BASELINE_WINDOW_DAYS = 5;
const MAX_LOGS = 500;
const MAX_INPUT_BYTES = 50000;
const MAX_SUMMARY_LENGTH = 500;
const MAX_KEY_INSIGHTS = 5;
const MAX_INSIGHT_LENGTH = 300;

const RESPONSE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        feeding_summary: { type: Type.STRING },
        sleep_summary: { type: Type.STRING },
        diaper_summary: { type: Type.STRING },
        key_insights: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
    },
    required: ['feeding_summary', 'sleep_summary', 'diaper_summary', 'key_insights']
};

const SYSTEM_INSTRUCTION = `You are a supportive, careful pediatric-information assistant helping parents understand their baby's recorded daily activities.
Analyze only the activity log data provided by the user. Summarize feeding, sleep, and diaper records in clear, neutral, parent-friendly language. Use the actual counts, amounts, durations, and patterns present in the records when useful. Treat missing data as unknown; never infer that an unrecorded activity did not happen. If there is too little data for a category, say so plainly.
Identify up to five notable changes or unusual patterns as cautious observations in key_insights, not as diagnoses or predictions. Keep each summary and insight concise. Do not prescribe feeding, sleep, or medical care, claim that an anomaly proves a health problem, or replace advice from a pediatrician. Avoid alarmist wording; for urgent health concerns, advise the parent to contact a qualified healthcare professional.
Do not infer the baby's age, identity, or medical history. Do not include personal identifying information. Respond with only the requested JSON object, with concise strings and no markdown.`;

const createFallbackSummary = () => ({
    feeding_summary: 'Summary unavailable.',
    sleep_summary: 'Summary unavailable.',
    diaper_summary: 'Summary unavailable.',
    key_insights: [FALLBACK_INSIGHT]
});

const createInsufficientDataSummary = (loggedDays) => {
    const message = `AI summaries need activity logged on at least ${MINIMUM_LOGGED_DAYS} separate days within the last ${BASELINE_WINDOW_DAYS} days. Activity is currently logged on ${loggedDays} ${loggedDays === 1 ? 'day' : 'days'}.`;
    return {
        feeding_summary: message,
        sleep_summary: message,
        diaper_summary: message,
        key_insights: [message]
    };
};

const getDistinctLoggedDays = (logsArray, timeZone = 'UTC') => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const loggedDays = new Set();

    logsArray.forEach((log) => {
        const timestamp = new Date(log.timestamp);
        if (!Number.isFinite(timestamp.getTime())) return;
        const dateParts = formatter.formatToParts(timestamp);
        const year = dateParts.find((part) => part.type === 'year')?.value;
        const month = dateParts.find((part) => part.type === 'month')?.value;
        const day = dateParts.find((part) => part.type === 'day')?.value;
        if (year && month && day) loggedDays.add(`${year}-${month}-${day}`);
    });

    return loggedDays.size;
};

const isBabySummaryFallback = (summary) => (
    summary?.feeding_summary === 'Summary unavailable.'
    && summary?.sleep_summary === 'Summary unavailable.'
    && summary?.diaper_summary === 'Summary unavailable.'
    && Array.isArray(summary?.key_insights)
    && summary.key_insights.length === 1
    && summary.key_insights[0] === FALLBACK_INSIGHT
);

const validateSummary = (summary) => {
    const expectedKeys = ['feeding_summary', 'sleep_summary', 'diaper_summary', 'key_insights'];
    if (
        !summary
        || typeof summary !== 'object'
        || Array.isArray(summary)
        || Object.keys(summary).length !== expectedKeys.length
        || !expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(summary, key))
        || !['feeding_summary', 'sleep_summary', 'diaper_summary'].every((key) => typeof summary[key] === 'string')
        || !['feeding_summary', 'sleep_summary', 'diaper_summary'].every((key) => summary[key].length <= MAX_SUMMARY_LENGTH)
        || !Array.isArray(summary.key_insights)
        || summary.key_insights.length > MAX_KEY_INSIGHTS
        || !summary.key_insights.every((insight) => typeof insight === 'string')
        || !summary.key_insights.every((insight) => insight.length <= MAX_INSIGHT_LENGTH)
    ) {
        throw new TypeError('Gemini returned a summary that did not match the required schema.');
    }

    return {
        feeding_summary: summary.feeding_summary.trim(),
        sleep_summary: summary.sleep_summary.trim(),
        diaper_summary: summary.diaper_summary.trim(),
        key_insights: summary.key_insights.map((insight) => insight.trim())
    };
};

const logGenerationError = (error) => {
    if (!process.env.GEMINI_API_KEY) {
        console.error('Gemini summary unavailable: GEMINI_API_KEY is not configured.');
    } else if (error instanceof SyntaxError) {
        console.error('Gemini summary unavailable: the API response was not valid JSON.', error.message);
    } else if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN'].includes(error?.code)
        || ['AbortError', 'FetchError', 'TimeoutError'].includes(error?.name)) {
        console.error('Gemini summary unavailable: a network error interrupted the request.', error.message);
    } else {
        console.error('Gemini summary generation failed:', error?.message || error);
    }
};

const generateBabySummary = async (logsArray) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured.');
        }
        if (!Array.isArray(logsArray) || logsArray.length > MAX_LOGS) {
            throw new TypeError(`Activity logs must be an array containing no more than ${MAX_LOGS} entries.`);
        }

        const logsContent = JSON.stringify(logsArray);
        if (Buffer.byteLength(logsContent, 'utf8') > MAX_INPUT_BYTES) {
            throw new RangeError('Activity logs exceed the maximum summary input size.');
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { timeout: 60000 }
        });
        const response = await ai.models.generateContent({
            model: MODEL,
            contents: [{ role: 'user', parts: [{ text: logsContent }] }],
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA
            }
        });

        if (typeof response.text !== 'string' || !response.text.trim()) {
            throw new SyntaxError('Gemini returned an empty response.');
        }

        return validateSummary(JSON.parse(response.text));
    } catch (error) {
        logGenerationError(error);
        return createFallbackSummary();
    }
};

module.exports = {
    generateBabySummary,
    isBabySummaryFallback,
    createInsufficientDataSummary,
    getDistinctLoggedDays,
    MINIMUM_LOGGED_DAYS,
    BASELINE_WINDOW_DAYS
};
