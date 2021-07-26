let menuBuscador = document.getElementById("menu-buscador")
let menuBuscadorPhone = document.getElementById("menu-buscador-phone")
if (navigator.userAgent.match(/Mobile/)) {
    menuBuscador.style.display = "none"
    menuBuscadorPhone.style.display = "block"
}

let hamburguer = document.getElementById("hamburguer");
hamburguer.onclick = function() {
    let menu = document.getElementById("menu");
    hamburguer.classList.toggle("change");
    if (menu.style.width === "0" || menu.style.width === "" || menu.style.width === "0px") {
        menu.style.width = "200px";
        hamburguer.style.position = "fixed"
    } else if (menu.style.width = "200px") {
        menu.style.width = "0";
        hamburguer.style.position = "absolute"
    }
}

let faq = document.getElementById("faq");

if (faq) {
    let accordion = document.getElementsByClassName("accordion");
    for (let i = 0; i < accordion.length; i++) {
        accordion[i].addEventListener("click", function() {
            this.classList.toggle("active");
            var panel = this.nextElementSibling;
            panel.style.display === "block" ? panel.style.display = "none" : panel.style.display = "block";
        });
    }
}

var header = document.getElementById("menu");
var sticky = header.offsetTop;

let fixHeader = () => {
    if (window.outerWidth && window.outerWidth < 577) return
    else {
        if (window.pageYOffset > sticky) header.classList.add("sticky");
        else header.classList.remove("sticky");
    }
}

window.onscroll = () => fixHeader()

// const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
// const d = new Date();

// let topMonth = document.getElementById("top-month")
// topMonth.innerText="Top "+ monthNames[d.getMonth()]