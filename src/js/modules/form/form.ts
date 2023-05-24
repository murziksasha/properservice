export function forms(){
  const form = document.querySelectorAll('form'),
        inputs: NodeListOf<HTMLInputElement> = document.querySelectorAll('input'); 

  const message = {
      loading: 'Загрузка...',
      success: 'Спасибо! Скоро мы с вами свяжемся',
      failure: 'Что-то пошло не так...'
  };

  const postData = async (url: string, data: any) => {
    const status = document.querySelector('.status');
    if(status !== null){
      status.textContent = message.loading;
    }
      let res = await fetch(url, {
          method: "POST",
          body: data
      });

      return await res.text();
  };

  const clearInputs = () => {
      inputs.forEach(item => {
          item.value = '';
      });
  };

  form.forEach((item: HTMLFormElement) => {
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
};
