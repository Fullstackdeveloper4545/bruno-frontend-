import React from 'react'

function StoreCard({ image, title, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-[280px] sm:max-w-none ${className}`}>
      <div className='w-full overflow-hidden rounded-xl bg-[#f2f2f2] aspect-[4/5] sm:aspect-[397/548]'>
        <img className='h-full w-full object-cover grayscale' src={image} alt={title} />
      </div>
      <p className='mt-4 text-center text-[18px] tracking-[1px] sm:mt-5 sm:text-[22px] sm:tracking-[1.4px]'>{title}</p>
   </div>
  )
}

export default StoreCard
