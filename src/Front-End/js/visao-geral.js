const resumoAuditoria = {
    local: "Rio de Janeiro, RJ",
    dataHora: "22/02/2026 às 15:00",
    equipe: "Amigos do Pace",
    esteira: "Esteira 1"
};

document.getElementById("resumoLocal").textContent = resumoAuditoria.local;
document.getElementById("resumoDataHora").textContent = resumoAuditoria.dataHora;
document.getElementById("resumoEquipe").textContent = resumoAuditoria.equipe;
document.getElementById("resumoEsteira").textContent = resumoAuditoria.esteira;

document.getElementById("btnIniciar").addEventListener("click", () => {
    window.location.href = "home-auditor.html";
});