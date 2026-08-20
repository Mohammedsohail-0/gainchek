import React from 'react'

/**
 * GainChek Official Logo Component
 * Uses clean SVG assets from /public folder (/logo-full.svg or /logo-icon.svg)
 */
export default function Logo({ height = 22, iconOnly = false, className = '', style = {} }) {
  const logoSrc = iconOnly ? '/logo-icon.svg' : '/logo-full.svg'

  return (
    <div
      className={`gainchek-official-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: height,
        lineHeight: 0,
        ...style,
      }}
    >
      <img
        src={logoSrc}
        alt="GainChek Logo"
        style={{
          height: height,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}
