const SLA = require('../models/SLA');

exports.getSLAs = async (req, res) => {
  try {
    const slas = await SLA.find();
    res.json(slas);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching SLAs', error: err.message });
  }
};

exports.createSLA = async (req, res) => {
  try {
    const sla = new SLA(req.body);
    await sla.save();
    res.status(201).json(sla);
  } catch (err) {
    res.status(400).json({ message: 'Error creating SLA', error: err.message });
  }
};

exports.updateSLA = async (req, res) => {
  try {
    const sla = await SLA.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!sla) return res.status(404).json({ message: 'SLA not found' });
    res.json(sla);
  } catch (err) {
    res.status(400).json({ message: 'Error updating SLA', error: err.message });
  }
};

exports.deleteSLA = async (req, res) => {
  try {
    const sla = await SLA.findByIdAndDelete(req.params.id);
    if (!sla) return res.status(404).json({ message: 'SLA not found' });
    res.json({ message: 'SLA deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting SLA', error: err.message });
  }
};
