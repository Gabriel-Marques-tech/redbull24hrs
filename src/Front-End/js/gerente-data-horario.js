const inputData = document.getElementById("dataCompeticao");
const inputHorario = document.getElementById("horarioCompeticao");
const btnProximoData = document.querySelector(".btn-proximo-data");

btnProximoData.addEventListener("click", () => {
    const dataHorario = {
        data: inputData.value,
        horario: inputHorario.value
    };

    localStorage.setItem("dataHorarioCompeticao", JSON.stringify(dataHorario));
    console.log("Data e horario definidos:", dataHorario);
});
