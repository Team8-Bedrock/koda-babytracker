//Resumed and Modified 
const express = require('express');
const router = express.Router();
const Log = require('../models/log');

router.post('/offline-log', async(req, res) => {
    const { logs } = req.body;

    if (!Array.isArray(logs) || logs.length == 0){
        return res.status(400).json({ error: 'Logs should be an array' });
    }

    try {
        const operations = log.map(log => ({
            updaeOne: {
                filter: { logID: log.logId || log.id},
                $setOnInsert: {
                    logId: log.logId || log.id,
                    timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
                    level: log.level || 'INFO',
                    message: log.message,
                    context: log.context || {}
                }
            },
            upsert: true
        }));
        const result = await Log.bulkWrite(operations, { ordered: false});
        return res.status(200).json({
            status: 'Success',
            received: log.length,
            inserted: result.upsertedCount,
            matched: result.matchedCount
        });
    } catch (error){
        console.error('Mongo DB Ooffline Failure:', error);
        return res.status(500).json({ error: 'Internal server logging failure' });
    }
});

module.exports = router;