import React from 'react'

function AdminRoutePage({ title, description }) {
  return (
    <div className='rounded-xl border border-black/10 bg-white p-6'>
      <h1 className='text-[24px] font-semibold text-black'>{title}</h1>
      <p className='mt-2 text-[14px] text-black/70'>{description || 'Admin page content goes here.'}</p>
    </div>
  )
}

export default AdminRoutePage
