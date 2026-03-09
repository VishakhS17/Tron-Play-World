import { FacebookIcon, InstagramIcon, LinkedInIcon, TwitterIcon } from '@/assets/icons/social'
import Link from 'next/link'

const socials = [
  {
    id: 1,
    href: '#',
    name: 'Facebook',
    icon: FacebookIcon,
  },
  {
    id: 2,
    href: '#',
    name: 'Twitter',
    icon: TwitterIcon,
  },
  {
    id: 3,
    href: '#',
    name: 'Instagram',
    icon: InstagramIcon,
  },
  {
    id: 4,
    href: '#',
    name: 'LinkedIn',
    icon: LinkedInIcon,
  },
]

export default function FooterSocials() {
  return (
    <div className="flex items-center gap-4 mt-7.5">
      {
        socials.map((social) => (
          <Link
            key={social.id}
            href={social.href}
            className="flex ease-out duration-200 hover:text-blue"
          >
            <span className="sr-only">{social.name} link</span>
            <social.icon />
          </Link>
        ))}
    </div>
  )
}
