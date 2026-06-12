const inputData = document.getElementById("dataCompeticao");
const inputHorario = document.getElementById("horarioCompeticao");
const btnProximoData = document.querySelector(".btn-proximo-data");

btnProximoData.addEventListener("click", () => {
    const dataHorario = {
        data: inputData.value,
        horario: inputHorario.value
    };

    if (!dataHorario.data || !dataHorario.horario) {
        alert("Preencha data e horário antes de continuar.");
        return;
    }
    localStorage.setItem("dataHorarioCompeticao", JSON.stringify(dataHorario));
    window.location.href = "/manager/create-event/teams";
});
