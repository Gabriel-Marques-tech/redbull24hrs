const btnRegistrarCheckpoint = document.getElementById("btnRegistrarCheckpoint");

btnRegistrarCheckpoint.addEventListener("click", () => {
    console.log("Solicita registro de checkpoint");
});

const btnFecharCheckpointTeste = document.getElementById("btnFecharCheckpointTeste");
const paginaCheckpointAviso = document.querySelector(".pagina-checkpoint-aviso");

btnFecharCheckpointTeste.addEventListener("click", () => {
    paginaCheckpointAviso.style.display = "none";
});
