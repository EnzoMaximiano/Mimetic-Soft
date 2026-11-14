// Mostra ou oculta a senha sem alterar o valor digitado.
//USER: Matheus Lino
document.addEventListener("DOMContentLoaded", () => {
    const campos = document.querySelectorAll('input[type="password"]');

    campos.forEach((campo) => {
        if (campo.closest(".campo-senha-visivel")) return;

        const wrapper = document.createElement("div");
        wrapper.className = "campo-senha-visivel";
        campo.parentNode.insertBefore(wrapper, campo);
        wrapper.appendChild(campo);

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "botao-ver-senha";
        botao.setAttribute("aria-label", "Mostrar senha");
        botao.setAttribute("title", "Mostrar senha");
        botao.innerHTML = iconeOlho(false);
        wrapper.appendChild(botao);

        botao.addEventListener("click", () => {
            const mostrar = campo.type === "password";
            campo.type = mostrar ? "text" : "password";
            botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
            botao.setAttribute("title", mostrar ? "Ocultar senha" : "Mostrar senha");
            botao.innerHTML = iconeOlho(mostrar);
            campo.focus();
        });
    });
});

// Devolve o SVG do ícone do botão de senha: olho cortado quando a senha está visível
// (ocultar = true) e olho aberto quando está escondida.
//USER: Matheus Lino
function iconeOlho(ocultar) {
    if (ocultar) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 8 9 8a17.7 17.7 0 0 1-2.1 3.2"/><path d="M6.6 6.6C4.4 8.1 3 12 3 12s3.5 8 9 8a9.7 9.7 0 0 0 4.1-.9"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
