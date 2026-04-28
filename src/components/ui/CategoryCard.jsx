import React from 'react'
import { Link } from 'react-router-dom'

const CategoryCard = ({
  title = 'Sapatilhas',
  image = '',
  buttonText = 'COMPRAR',
  to = '/products',
  buttons = [],
}) => {
  const style = image ? { backgroundImage: `url(${image})` } : undefined
  const showButtons = Array.isArray(buttons) && buttons.length > 0

  return (
    <>
      <div
        className='category-card-bg w-full md:w-3/12 h-[50vh] flex justify-center items-center flex-col gap-4'
        style={style}
        data-theme-image='public_category_card_bg_image'
        data-theme-image-label='Category card background'
      >
        <h1 className='text-[32px] text-white'>{title}</h1>
        {showButtons ? (
          <div className='flex flex-wrap justify-center gap-3'>
            {buttons.map((button) => (
              <Link key={button.to} to={button.to} className='text-[14px] bg-white py-2 px-10'>
                {button.label}
              </Link>
            ))}
          </div>
        ) : (
          <Link to={to} className='text-[14px] bg-white py-2 px-10'>
            {buttonText}
          </Link>
        )}
      </div>
    </>
  )
}

export default CategoryCard
