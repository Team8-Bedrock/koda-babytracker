//mdz0019
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const Feeding = require('../models/feeding');
const Sleep = require('../models/sleep');
const Diaper = require('../models/diaper');
const Child = require('../models/Child');
const { drawSleepChart, drawFeedingChart, drawDiaperSummary, drawReportHeader, drawChildInformation, drawActivitySummary, drawAtAGlance, drawChartsPanel } = require('../reports/pdfReport');

const authMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ msg: 'Token is not valid' });
    }
};

const findAuthorizedChild = (childId, userId) => Child.findOne({
    _id: childId,
    $or: [
        { userId },
        { caregiverIds: userId }
    ]
});

const getRangeWindow = (range) => {
    const now = new Date();
    const start = new Date(now);

    if (range === 'week') {
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
    } else {
        start.setHours(0, 0, 0, 0);
    }

    return { start, end: now };
};

const filterByRange = (items, range) => {
    const { start, end } = getRangeWindow(range);
    return items.filter((item) => {
        const timestamp = new Date(item.timestamp || item.startTime || item.endTime || item.createdAt || Date.now());
        return timestamp >= start && timestamp <= end;
    });
};
// Calculates sleep duration statistics for AI report analysis
const calculateSleepDuration = (sleeps) => {
    if (!sleeps || sleeps.length === 0) {
        return {
            totalMinutes: 0,
            averageMinutes: 0,
            longestMinutes: 0,
            shortestMinutes: 0
        };
    }

    const durations = sleeps
        .map((sleep) => Number(sleep.duration))
        .filter((duration) => !isNaN(duration) && duration >= 0);

    if (durations.length === 0) {
        return {
            totalMinutes: 0,
            averageMinutes: 0,
            longestMinutes: 0,
            shortestMinutes: 0
        };
    }

    const totalMinutes = durations.reduce(
        (total, duration) => total + duration,
        0
    );

    return {
        totalMinutes,
        averageMinutes: Math.round(totalMinutes / durations.length),
        longestMinutes: Math.max(...durations),
        shortestMinutes: Math.min(...durations)
    };
};
// Calculates how often feeding, sleep, and diaper activities occur
const calculateActivityFrequency = ({ feedings, sleeps, diapers, range }) => {
    const daysInRange = range === 'week' ? 7 : 1;

    const feedingCount = feedings.length;
    const sleepCount = sleeps.length;
    const diaperCount = diapers.length;

    return {
        feedingCount,
        sleepCount,
        diaperCount,

        totalActivities:
            feedingCount + sleepCount + diaperCount,

        feedingPerDay:
            Number((feedingCount / daysInRange).toFixed(1)),

        sleepPerDay:
            Number((sleepCount / daysInRange).toFixed(1)),

        diaperPerDay:
            Number((diaperCount / daysInRange).toFixed(1))
    };
};

// Calculates how many days have at least one logged activity
const calculateDaysLogged = ({ feedings, sleeps, diapers, range }) => {
    const daysInRange = range === 'week' ? 7 : 1;

    const loggedDates = new Set();

    [...feedings, ...sleeps, ...diapers].forEach((item) => {
        const timestamp = new Date(
            item.timestamp ||
            item.startTime ||
            item.endTime
        );

        if (!isNaN(timestamp)) {
            loggedDates.add(
                timestamp.toISOString().split('T')[0]
            );
        }
    });

    const daysLogged = loggedDates.size;

    return {
        daysLogged,
        daysInRange,
        percentage: Math.round(
            (daysLogged / daysInRange) * 100
        )
    };
};

const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
        return `${hours} hr ${mins} min`;
    }

    if (hours > 0) {
        return `${hours} hr`;
    }

    return `${mins} min`;
};

// Calculates child's current age
const calculateAge = (dob) => {
    if (!dob) return 'Not provided';

    const [year, month, day] = dob.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();

    if (birthDate > today) return 'Invalid date of birth';

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (today.getDate() < birthDate.getDate()) {
        months -= 1;
    }

    if (months < 0) {
        years -= 1;
        months += 12;
    }

    if (years > 0) {
        return `${years} year${years !== 1 ? 's' : ''}${months > 0
            ? ` ${months} month${months !== 1 ? 's' : ''}`
            : ''
            }`;
    }

    if (months > 0) {
        return `${months} month${months !== 1 ? 's' : ''}`;
    }

    const days = Math.floor(
        (today - birthDate) / (1000 * 60 * 60 * 24)
    );

    return `${days} day${days !== 1 ? 's' : ''}`;
};

const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';

    const [year, month, day] = dateString.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

const formatReportPeriod = (range) => {
    const { start, end } = getRangeWindow(range);

    const startDate = start.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
    });

    const endDate = end.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    if (range === 'day') {
        return end.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    return `${startDate} - ${endDate}`;
};
// for sleep chart in pdf
const buildSleepChartData = (sleeps, range) => {
    if (range === 'day') {
        return sleeps.map((sleep, index) => ({
            label: `Sleep ${index + 1}`,
            minutes: Number(sleep.duration) || 0
        }));
    }

    const { start } = getRangeWindow(range);
    const days = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        days.push({
            dateKey: date.toISOString().split('T')[0],
            label: date.toLocaleDateString('en-US', {
                weekday: 'short'
            }),
            dateLabel: date.toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric'
            }),
            minutes: 0
        });
    }

    sleeps.forEach((sleep) => {
        const sleepDate = new Date(
            sleep.timestamp || sleep.startTime
        );

        const dateKey = sleepDate.toISOString().split('T')[0];

        const day = days.find(
            (item) => item.dateKey === dateKey
        );

        if (day) {
            day.minutes += Number(sleep.duration) || 0;
        }
    });

    return days;
};

// for feeding chart in pdf
const buildFeedingChartData = (feedings, range) => {
    if (range === 'day') {
        return feedings.map((feeding, index) => ({
            label: `Feed ${index + 1}`,
            count: 1,
            ounces: Number(feeding.amount) || 0
        }));
    }

    const { start } = getRangeWindow(range);
    const days = [];

    for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        days.push({
            dateKey: date.toISOString().split('T')[0],
            label: date.toLocaleDateString('en-US', {
                weekday: 'short'
            }),
            dateLabel: date.toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric'
            }),
            count: 0,
            ounces: 0
        });
    }

    feedings.forEach((feeding) => {
        const feedingDate = new Date(feeding.timestamp);
        const dateKey = feedingDate.toISOString().split('T')[0];

        const day = days.find(
            (item) => item.dateKey === dateKey
        );

        if (day) {
            day.count += 1;
            day.ounces += Number(feeding.amount) || 0;
        }
    });

    return days;
};

// for diaper in pdf
const buildDiaperSummary = (diapers) => {
    const counts = {
        Wet: 0,
        Dirty: 0,
        Mixed: 0
    };

    diapers.forEach((diaper) => {
        if (counts[diaper.type] !== undefined) {
            counts[diaper.type] += 1;
        }
    });

    const total =
        counts.Wet +
        counts.Dirty +
        counts.Mixed;

    return {
        counts,
        total
    };
};

const buildAiAnalysis = ({ feedings, sleeps, diapers, range, childName }) => {
    const lines = [];
    lines.push(`AI-guided summary for ${childName}`);
    lines.push(`This ${range === 'week' ? 'weekly' : 'daily'} report highlights the latest routine patterns.`);

    if (feedings.length === 0 && sleeps.length === 0 && diapers.length === 0) {
        lines.push('No activity entries were recorded in the selected period, so there is not enough data to infer a meaningful routine yet.');
        return lines.join('\n');
    }
    const frequencyStats = calculateActivityFrequency({
        feedings,
        sleeps,
        diapers,
        range
    });

    lines.push('Activity frequency:');

    if (range === 'week') {
        lines.push(
            `Feeding: ${frequencyStats.feedingCount} entries, averaging ${frequencyStats.feedingPerDay} per day.`
        );

        lines.push(
            `Sleep: ${frequencyStats.sleepCount} entries, averaging ${frequencyStats.sleepPerDay} per day.`
        );

        lines.push(
            `Diaper changes: ${frequencyStats.diaperCount} entries, averaging ${frequencyStats.diaperPerDay} per day.`
        );
    } else {
        lines.push(
            `Feeding: ${frequencyStats.feedingCount} entries today.`
        );

        lines.push(
            `Sleep: ${frequencyStats.sleepCount} entries today.`
        );

        lines.push(
            `Diaper changes: ${frequencyStats.diaperCount} entries today.`
        );
    }

    lines.push(
        `Total activities recorded: ${frequencyStats.totalActivities}.`
    );
    if (feedings.length > 0) {
        const latestAmount = feedings[0].amount || 'N/A';
        const feedingTrend = feedings.length >= 3 ? 'consistent' : 'light';
        lines.push(`Feeding activity looks ${feedingTrend}. The most recent entry was ${feedings[0].type || 'N/A'}${latestAmount !== 'N/A' ? ` with ${latestAmount}` : ''}.`);
    }

    if (sleeps.length > 0) {
        const sleepStats = calculateSleepDuration(sleeps);

        lines.push(
            `Sleep duration: ${sleepStats.totalMinutes} total minutes recorded across ${sleeps.length} sleep entries.`
        );

        lines.push(
            `The average sleep session was ${sleepStats.averageMinutes} minutes, with the longest session lasting ${sleepStats.longestMinutes} minutes and the shortest lasting ${sleepStats.shortestMinutes} minutes.`
        );
    }

    if (diapers.length > 0) {
        const diaperSummary = diapers.slice(0, 3).map((item) => item.type).join(', ');
        lines.push(`Diaper updates recorded: ${diaperSummary}.`);
    }

    lines.push('This summary is designed to help a parent quickly understand the child\'s recent routine without needing to read every raw log entry.');
    return lines.join('\n');
};

const buildReportText = ({ feedings, sleeps, diapers, range, childName, childProfile }) => {
    const lines = [];
    lines.push('CHILD INFORMATION');
    lines.push(`Name: ${childName}`);

    if (childProfile) {
        lines.push(`Date of Birth: ${formatDate(childProfile.dob)}`);
        lines.push(`Age: ${calculateAge(childProfile.dob)}`);
        lines.push(`Weight: ${childProfile.weight || 'Not provided'}`);
        lines.push(`Allergies: ${childProfile.allergies || 'Not provided'}`);

        if (childProfile.other) {
            lines.push(`Other Notes: ${childProfile.other}`);
        }
    }

    lines.push(`Report Type: ${range === 'week' ? 'Weekly' : 'Daily'}`);
    lines.push(`Report Period: ${formatReportPeriod(range)}`);
    const sleepStats = calculateSleepDuration(sleeps);

    const frequencyStats = calculateActivityFrequency({
        feedings,
        sleeps,
        diapers,
        range
    });

    lines.push('AT A GLANCE');
    lines.push(`Total Sleep: ${sleepStats.totalMinutes} min`);
    lines.push(`Average Sleep Session: ${sleepStats.averageMinutes} min`);
    lines.push(`Feedings: ${frequencyStats.feedingCount}`);
    lines.push(`Diaper Changes: ${frequencyStats.diaperCount}`);
    lines.push('');
    lines.push('AI-guided summary:');
    lines.push(buildAiAnalysis({ feedings, sleeps, diapers, range, childName }));
    lines.push('');
    lines.push('Highlights:');

    if (feedings.length > 0) {
        const latest = feedings[0];
        lines.push(`- Latest feeding: ${latest.type || 'N/A'}${latest.amount ? ` (${latest.amount})` : ''}`);
    }

    if (sleeps.length > 0) {
        const latest = sleeps[0];
        lines.push(`- Latest sleep: ${latest.quality || 'N/A'}${latest.duration ? ` (${latest.duration} min)` : ''}`);
    }

    if (diapers.length > 0) {
        const latest = diapers[0];
        lines.push(`- Latest diaper: ${latest.type || 'N/A'}`);
    }

    lines.push('');
    lines.push('Recent history:');
    feedings.slice(0, 3).forEach((item) => {
        lines.push(`- Feeding: ${item.type || 'N/A'} at ${new Date(item.timestamp).toLocaleString()}`);
    });
    sleeps.slice(0, 3).forEach((item) => {
        lines.push(`- Sleep: ${item.quality || 'N/A'} at ${new Date(item.timestamp).toLocaleString()}`);
    });
    diapers.slice(0, 3).forEach((item) => {
        lines.push(`- Diaper: ${item.type || 'N/A'} at ${new Date(item.timestamp).toLocaleString()}`);
    });

    return lines.join('\n');
};

//Feeding routes
router.post("/feeding", authMiddleware, async (req, res) => {
    try {
        const { childId, type, amount, side } = req.body;

        const child = await findAuthorizedChild(childId, req.user.id);
        if (!child) {
            return res.status(404).json({ error: "Child profile not found or access denied" });
        }

        const newFeeding = await Feeding.create({
            childId,
            loggedBy: req.user.id,
            type,
            amount,
            side
        });

        res.status(201).json(newFeeding);
      } catch (err) {
        res.status(400).json({ error: err.message });
  }
});

//Sleep routes
router.post('/sleep', authMiddleware, async (req, res) => {
    try {
        const { childId, startTime, endTime, duration, type, quality } = req.body;

        const child = await findAuthorizedChild(childId, req.user.id);
        if (!child) {
            return res.status(404).json({ error: "Child profile not found or access denied" });
        }

        const sleep = await Sleep.create({
            childId,
            loggedBy: req.user.id,
            startTime,
            endTime,
            duration,
            type,
            quality
        });

        res.status(201).json(sleep);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//Diaper routes
router.post('/diaper', authMiddleware, async (req, res) => {
    try {
        const { childId, type } = req.body;

        const child = await findAuthorizedChild(childId, req.user.id);
        if (!child) {
            return res.status(404).json({ error: "Child profile not found or access denied" });
        }

        const diaper = await Diaper.create({
            childId,
            loggedBy: req.user.id,
            type
        });

        res.status(201).json(diaper);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//GET all activities
router.get('/activities', authMiddleware, async (req, res) => {
    try {
        const { childId } = req.query;

        if (!childId) {
            return res.status(400).json({ error: "childId query parameter is required" });
        }

        const child = await findAuthorizedChild(childId, req.user.id);
        if (!child) {
            return res.status(404).json({ error: "Child profile not found or access denied" });
        }

        const filter = { childId };

        const feedings = await Feeding.find(filter)
            .populate('loggedBy', 'username role')
            .sort({ timestamp: -1 });
        const sleeps = await Sleep.find(filter)
            .populate('loggedBy', 'username role')
            .sort({ timestamp: -1 });
        const diapers = await Diaper.find(filter)
            .populate('loggedBy', 'username role')
            .sort({ timestamp: -1 });

        res.json({ feedings, sleeps, diapers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// reports
router.post('/reports/generate', authMiddleware, async (req, res) => {
    try {
        const { childId } = req.body;
        const range = req.body.range || 'day';

        if (!childId) {
            return res.status(400).json({ error: "childId is required to generate a report" });
        }

        // Verify authorized access: primary parent (userId) OR authorized caregiver
        const childProfile = await findAuthorizedChild(childId, req.user.id);

        if (!childProfile) {
            return res.status(404).json({ error: "Child profile not found or access denied" });
        }

        const childName = childProfile.name;
        const filter = { childId };

        const childInfo = {
            name: childName,
            dob: childProfile.dob ? formatDate(childProfile.dob) : 'Not provided',
            age: childProfile.dob ? calculateAge(childProfile.dob) : 'Not provided',
            weight: childProfile.weight || 'Not provided',
            allergies: childProfile.allergies || 'Not provided'
        };

        const reportInfo = {
            period: formatReportPeriod(range),
            type: range === 'week' ? 'Weekly' : 'Daily',
            generated: new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            })
        };

        const feedings = await Feeding.find(filter).sort({ timestamp: -1 });
        const sleeps = await Sleep.find(filter).sort({ timestamp: -1 });
        const diapers = await Diaper.find(filter).sort({ timestamp: -1 });

        const scopedFeedings = filterByRange(feedings, range);
        const scopedSleeps = filterByRange(sleeps, range);
        const scopedDiapers = filterByRange(diapers, range);

        const sleepStats = calculateSleepDuration(scopedSleeps);

        const frequencyStats = calculateActivityFrequency({
            feedings: scopedFeedings,
            sleeps: scopedSleeps,
            diapers: scopedDiapers,
            range
        });

        const daysInRange = range === 'week' ? 7 : 1;

        const totalFeedingOunces = scopedFeedings.reduce(
            (total, feeding) => total + (Number(feeding.amount) || 0),
            0
        );

        const averageFeedingOuncesPerDay = Number(
            (totalFeedingOunces / daysInRange).toFixed(1)
        );

        const chartStats = {
            sleepPerDay: formatDuration(
                Math.round(sleepStats.totalMinutes / daysInRange)
            ),
            feedingPerDay: `${averageFeedingOuncesPerDay} oz`,
            diaperPerDay: frequencyStats.diaperPerDay
        };

        const daysLoggedStats = calculateDaysLogged({
            feedings: scopedFeedings,
            sleeps: scopedSleeps,
            diapers: scopedDiapers,
            range
        });

        const summaryText =
            `During this ${range === 'week' ? 'reporting period' : 'day'}, ` +
            `${frequencyStats.feedingCount} feeding${frequencyStats.feedingCount !== 1 ? 's' : ''}, ` +
            `${frequencyStats.sleepCount} sleep session${frequencyStats.sleepCount !== 1 ? 's' : ''}, ` +
            `and ${frequencyStats.diaperCount} diaper change${frequencyStats.diaperCount !== 1 ? 's' : ''} were recorded. ` +
            `Total recorded sleep was ${formatDuration(sleepStats.totalMinutes)}, ` +
            `with an average session of ${formatDuration(sleepStats.averageMinutes)}.`;

        const atAGlanceStats = {
            totalSleep: formatDuration(sleepStats.totalMinutes),
            averageSleep: formatDuration(sleepStats.averageMinutes),
            feedings: frequencyStats.feedingCount,
            feedingPerDay: frequencyStats.feedingPerDay,
            diapers: frequencyStats.diaperCount,
            diaperPerDay: frequencyStats.diaperPerDay,
            daysLogged: `${daysLoggedStats.daysLogged} / ${daysLoggedStats.daysInRange}`,
            daysLoggedPercent: `${daysLoggedStats.percentage}%`
        };

        const sleepChartData = buildSleepChartData(scopedSleeps, range);
        const feedingChartData = buildFeedingChartData(scopedFeedings, range);
        const diaperSummary = buildDiaperSummary(scopedDiapers);

        const doc = new PDFDocument({ margin: 36 });
        const reportText = buildReportText({
            feedings: scopedFeedings,
            sleeps: scopedSleeps,
            diapers: scopedDiapers,
            range,
            childName,
            childProfile
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${childName}-${range}-report.pdf"`);

        doc.pipe(res);

        // Page 1
        drawReportHeader(doc, range);
        drawChildInformation(doc, childInfo, reportInfo);
        drawActivitySummary(doc, summaryText);
        drawAtAGlance(doc, atAGlanceStats);
        const chartY = doc.y + 20;

        drawChartsPanel(doc, sleepChartData, feedingChartData, diaperSummary, range, chartStats, chartY);

        doc.end();

    } catch (err) {
        console.error('Report generation error:', err);
        res.status(500).json({ error: err.message });
    }
});

//Ofline sync route
router.post('/offline_sync', async (req, res) => {
    const activities = req.body;

    if (!Array.isArray(activities) || activities.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty activities array' });
    }

    try {
        for (const item of activities) {
            const { type, data } = item;
            if(!data.babyId || !data.userId) {
                console.warm('[Sunc Warning] Missing babyId or userId in offline activity data:', data);
                continue; // Skip this entry
            }

            if(type === 'feeding') {
                await Feeding.create({
                    babyId: data.babyId,
                    userId: data.userId,
                    amount: data.amount,
                    type: data.type,
                    timestamp: data.timestamp,
                });
            } else if(type === 'sleep') {
                await Sleep.create({
                    babyId: data.babyId,
                    userId: data.userId,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    duration: data.duration,
                    quality: data.quality,
                    timestamp: data.timestamp,
                });
            } else if(type === 'diaper') {
                await Diaper.create({
                    babyId: data.babyId,
                    userId: data.userId,
                    type: data.type,
                    timestamp: data.timestamp,
                });
            }
        }
        return res.status(200).json({
            status: 'Success',
            message: 'Offline activities synchronized successfully',
        });
        } catch (error) {
            console.error('[Sync Error] Failed to synchronize offline activities:', error);
            return res.status(500).json({ error: 'Failed to synchronize offline activities' });
        }
    });

module.exports = router;
