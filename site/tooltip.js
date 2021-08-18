const tooltip = document.createElement("div");
Object.assign(tooltip.style, {
  position: "absolute",
  display: "none",
  fontFamily: "'{codeFont}', monospace",
  fontSize: "14px",
  backgroundColor: "#1E1E1E",
  border: "1px solid #727272",
  padding: "4px",
});
const offset = 20;
document.body.addEventListener("mousemove", (e) => {
  tooltip.style.top = offset + e.clientY + "px";
  tooltip.style.left = offset + e.clientX + "px";
});
document.body.appendChild(tooltip);
const lsps = document.getElementsByTagName("data-lsp");
let timeout = 0;
for (let i = 0; i < lsps.length; i++) {
  const lsp = lsps[i];
  lsp.addEventListener("mouseenter", (e) => {
    clearTimeout(timeout);
    tooltip.textContent = e.target.getAttribute("lsp");
    tooltip.style.display = "";
  });
  lsp.addEventListener("mouseleave", () => {
    timeout = setTimeout(() => {
      tooltip.style.display = "none";
      tooltip.textContent = "";
    }, 200);
  });
}
