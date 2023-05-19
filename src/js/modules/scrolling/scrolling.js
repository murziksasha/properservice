export function scrolling(upSelector) {
    const upElem = document.querySelector(upSelector);
    upElem.classList.add('animate__animated', '_hide');
    window.addEventListener('scroll', () => {
        if (document.documentElement.scrollTop > 1650) {
            upElem.classList.remove('animate__fadeOut', '_hide');
            upElem.classList.add('animate__fadeIn', '_show');
        }
        else {
            upElem.classList.remove('animate__fadeIn', '_show');
            upElem.classList.add('animate__fadeOut', '_hide');
        }
    });
    let links = document.querySelectorAll('[href^="#"]'); // получем все локальные ссылки 
    let speed = 0.2;
    links.forEach(item => {
        item.addEventListener('click', e => {
            var _a;
            e.preventDefault();
            const target = e.currentTarget;
            let widthTop = document.documentElement.scrollTop;
            let hash = target.hash;
            let toBlock = (_a = document.querySelector(hash)) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect().top;
            let start = null;
            requestAnimationFrame(step);
            function step(time) {
                if (start === null) {
                    start = time;
                }
                let progress = time - start;
                if (toBlock) { // вся операция внутри нужна на сколько пикселей продвинуть и в какую сторону
                    let r = (toBlock < 0 ? Math.max(widthTop - progress / speed, widthTop + toBlock) : Math.min(widthTop + progress / speed, widthTop + toBlock)); // переменная отвечает за кол-во пикселей отлистываем для анимации
                    document.documentElement.scrollTo(0, r);
                    //реализации остановки анимации
                    if (r !== widthTop + toBlock) {
                        requestAnimationFrame(step);
                    }
                    else {
                        location.hash = hash;
                    }
                }
            }
        });
    });
}
//# sourceMappingURL=scrolling.js.map