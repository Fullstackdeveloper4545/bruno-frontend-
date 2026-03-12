import React from 'react'

function CommunityCard({ image, alt }) {
  return (
    <div className='w-full h-[240px] overflow-hidden'>
      <img className='w-full h-full object-cover' src={image} alt={alt} />
    </div>
  )
}

export default CommunityCard
