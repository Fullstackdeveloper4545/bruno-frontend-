import React from 'react'
import { Link } from 'react-router-dom'

const BlogCard = ({ image, title, date, linkText = 'Ler mais', to = '/blogs' }) => {
  return (
    <article className='w-full'>
      <div className='w-full aspect-square bg-[#d9d9d9] overflow-hidden'>
        <img src={image} alt={title} className='w-full h-full object-cover' />
      </div>
      <div className='pt-4'>
        <h3 className='m-0 text-[15px] font-semibold text-black'>{title}</h3>
        <p className='m-0 mt-3 text-[12px] text-black/70'>{date}</p>
        <Link to={to} className='inline-block mt-3 text-[12px] text-black'>
          {linkText}
        </Link>
      </div>
    </article>
  )
}

export default BlogCard
