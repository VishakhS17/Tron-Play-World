import Image from "next/image";
import Link from "next/link";

interface SmallPromoBannerProps {
  imageUrl: string;
  subtitle: string;
  title: string;
  discount?: string;
  link: string;
  buttonText: string;
  rightAlign?: boolean;

  buttonColor?: string;
  description?: string;
}

export default function SmallPromoBanner({
  imageUrl,
  subtitle,
  title,
  discount,
  link,
  buttonText,
  rightAlign = false,
  buttonColor = "bg-teal hover:bg-teal-dark",
  description,
}: SmallPromoBannerProps) {
  return (
    <div
      className={`relative z-1 overflow-hidden rounded-2xl bg-gray-2 py-10 xl:py-16 px-4 sm:px-7.5 xl:px-10`}
    >
      <div className={`${rightAlign ? "text-right" : ""}`}>
        <span className="block text-lg text-dark mb-1.5">{subtitle}</span>
        <h2 className="font-bold text-xl lg:text-heading-4 text-dark mb-2.5">
          {title}
        </h2>
        {description ? (
          <p
            className={`max-w-[285px] text-custom-sm mb-2.5 ${
              rightAlign ? "ml-auto" : ""
            }`}
          >
            {description}
          </p>
        ) : (
          <p className="text-lg font-medium text-blue">{discount}</p>
        )}
        <Link
          href={link}
          className={`inline-flex font-medium text-custom-sm text-white bg-dark hover:bg-darkLight py-3 px-7 rounded-lg ease-out duration-200 mt-7.5`}
        >
          {buttonText}
        </Link>
      </div>
      <Image
        src={imageUrl}
        alt="promo img"
        className={`absolute top-1/2 -translate-y-1/2 ${
          rightAlign ? "left-3 sm:left-10" : "right-3 sm:right-8.5"
        } -z-1`}
        width={214}
        height={260}
      />
    </div>
  );
}
