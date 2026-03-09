import Image from 'next/image'

export default function Graphics() {
  return (
    <>
      <Image
        src="/images/shapes/newsletter-bg.jpg"
        alt="background illustration"
        className="absolute -z-1 w-full h-full left-0 top-0 rounded-xl"
        width={1170}
        height={200}
      />
      <div className="absolute -z-1 max-w-[523px] max-h-[243px] w-full h-full right-0 top-0 bg-gradient-1"></div>
    </>
  )
}
