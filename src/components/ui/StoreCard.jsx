import React from 'react'

function StoreCard({ image, title, className = '' }) {
  return (
    <div className={`w-full ${className}`}>
      <div className='w-full aspect-[397/548] overflow-hidden bg-[#f2f2f2]'>
        <img className='w-full h-full object-cover grayscale' src={image} alt={title} />
      </div>
      <p className='text-center text-[22px] mt-5 tracking-[1.4px]'>{title}</p>
   </div>
  )
}

export default StoreCard
