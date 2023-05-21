

export function moreFeedbacks() {
  const btn = document.querySelector('#feed-google') as HTMLButtonElement;
  btn.addEventListener('click', () => {
    window.open('https://g.co/kgs/q9zz5C', '_blank');
  })
}