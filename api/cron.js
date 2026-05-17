const { runCheck } = require("../lib/monitor");

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const bearer = req.headers.authorization === `Bearer ${secret}`;
  const query = req.query?.secret === secret;
  return bearer || query;
}

module.exports = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const state = await runCheck({ notifyOnChange: true });
    return res.status(200).json({ ok: true, ...state });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
