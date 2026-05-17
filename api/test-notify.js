const { runTestCheck } = require("../lib/monitor");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const state = await runTestCheck();
    return res.status(200).json(state);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
