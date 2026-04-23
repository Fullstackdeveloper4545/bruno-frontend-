import React from 'react'
import { Link } from 'react-router-dom'
import productImage from '../../assets/product-card-test-image.png'

const ProductCard = ({
  image = productImage,
  title = 'Asics Superblast 2',
  color = 'Verde Vital e Preto',
  price = '00 EUR',
  oldPrice,
  discountLabel,
  stockLabel,
  to,
}) => {
  const isOutOfStock = typeof stockLabel === 'string' && stockLabel.toLowerCase().includes('out of stock')

  const cardContent = (
    <>
      <div className='relative pb-8'>
        {discountLabel ? (
          <span className='absolute top-0 left-0 text-[12px] text-red-500'>{discountLabel}</span>
        ) : null}
        {stockLabel ? (
          <span
            className={`absolute top-0 right-0 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${
              isOutOfStock ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#fef3c7] text-[#92400e]'
            }`}
          >
            {stockLabel}
          </span>
        ) : null}
        <img src={image} alt={title} className='w-full' />
      </div>
      <div className='flex justify-between w-full text-[12px]'>
        <div className='min-w-0'>
          <p className='truncate'>{title}</p>
          <p className='truncate text-[var(--grey-light-active)]'>{color}</p>
        </div>
        <div className='text-right'>
          {oldPrice ? (
            <p className='text-[11px] line-through text-[var(--grey-light-active)]'>{oldPrice}</p>
          ) : null}
          <p>{price}</p>
        </div>
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className='block w-full pb-12 cursor-pointer' aria-label={`Open ${title}`}>
        {cardContent}
      </Link>
    )
  }

  return <div className='w-full pb-12'>{cardContent}</div>
}

export default ProductCard
