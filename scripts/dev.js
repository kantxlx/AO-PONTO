const { spawn } = require("node:child_process");
const children = ["@ao-ponto/api", "@ao-ponto/web"].map((workspace) =>
  spawn(
    process.execPath,
    [process.env.npm_execpath, "run", "dev", "-w", workspace],
    { stdio: "inherit", env: process.env },
  ),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === "win32")
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    else child.kill("SIGTERM");
  }
  process.exitCode = code;
}
children.forEach((child) => {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
});
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
