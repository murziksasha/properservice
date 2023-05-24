var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export function forms() {
    const form = document.querySelectorAll('form'), inputs = document.querySelectorAll('input');
    const message = {
        loading: 'Загрузка...',
        success: 'Спасибо! Скоро мы с вами свяжемся',
        failure: 'Что-то пошло не так...'
    };
    const postData = (url, data) => __awaiter(this, void 0, void 0, function* () {
        const status = document.querySelector('.status');
        if (status !== null) {
            status.textContent = message.loading;
        }
        let res = yield fetch(url, {
            method: "POST",
            body: data
        });
        return yield res.text();
    });
    const clearInputs = () => {
        inputs.forEach(item => {
            item.value = '';
        });
    };
    form.forEach((item) => {
        item.addEventListener('submit', (e) => {
            e.preventDefault();
            let statusMessage = document.createElement('div');
            statusMessage.classList.add('status');
            item.appendChild(statusMessage);
            const formData = new FormData(item);
            postData('mailer/smart.php', formData)
                .then(res => {
                statusMessage.textContent = message.success;
            })
                .catch(() => statusMessage.textContent = message.failure)
                .finally(() => {
                clearInputs();
                setTimeout(() => {
                    statusMessage.remove();
                }, 3000);
            });
        });
    });
}
;
//# sourceMappingURL=form.js.map