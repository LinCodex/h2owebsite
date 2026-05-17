const { sendNtfy, getStatus } = require("../lib/monitor");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const state = await getStatus();
    await sendNtfy(
      "H2O monitor test",
      `Test notification from your Vercel monitor. Site status: ${state.status ?? "not checked yet"}.`,
      "default"
    );
    return res.status(200).json({ ok: true, topic: "h20-alert-20111" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
