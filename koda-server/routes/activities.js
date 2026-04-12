//mdz0019
const express = require('express');
const router = express.Router();
const Feeding = require('../model/feeding');
const Sleep = require('../model/sleep');
const Diaper = require('../model/diaper');

//Feeding routes
router.post('/feeding', async (req, res) => {
    try {
        const feeding = new Feeding(req.body);
        await feeding.save();
        res.status(201).json(feeding);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//Sleep routes
router.post('/sleep', async (req, res) => {
    try {
        const sleep = new Sleep(req.body);
        await sleep.save();
        res.status(201).json(sleep);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//Diaper routes
router.post('/diaper', async (req, res) => {
    try {
        const diaper = new Diaper(req.body);
        await diaper.save();
        res.status(201).json(diaper);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//GET all activities
router.get('/activities', async (req, res) => {
    try {
        const feedings = await Feeding.find().sort({ timestamp: -1 });
        const sleeps = await Sleep.find().sort({ timestamp: -1 });
        const diapers = await Diaper.find().sort({ timestamp: -1 });
        res.json({ feedings, sleeps, diapers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

