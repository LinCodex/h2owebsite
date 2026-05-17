const { getStatus } = require("../lib/monitor");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const state = await getStatus();
  return res.status(200).json(state);
};
