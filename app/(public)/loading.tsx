export default function PublicLoading() {
  return (
    <div className='page-loading wrapper' aria-busy='true' aria-label='Завантаження сторінки'>
      <div className='visually-hidden'>Завантаження...</div>
    </div>
  );
}
