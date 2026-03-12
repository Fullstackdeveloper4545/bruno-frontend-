import React from 'react'
import { Link } from 'react-router-dom'

const CategoryCard = ({ title = 'Sapatilhas', image = '', buttonText = 'COMPRAR', to = '/products' }) => {
  const style = image ? { backgroundImage: `url(${image})` } : undefined

  return (
    <>
      <div
        className='category-card-bg w-full md:w-3/12 h-[50vh] flex justify-center items-center flex-col gap-4'
        style={style}
      >
        <h1 className='text-[32px] text-white'>{title}</h1>
        <Link to={to} className='text-[14] bg-white py-2 px-10'>
          {buttonText}
        </Link>
      </div>
    </>
  )
}

export default CategoryCard
