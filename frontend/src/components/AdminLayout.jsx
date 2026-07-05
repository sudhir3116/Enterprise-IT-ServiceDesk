import React from 'react'
import Breadcrumbs from './ui/Breadcrumbs'
import Button from './ui/Button'

export default function AdminLayout({ title, description, breadcrumbs = [], actions, children }){
  return (
    <div className="admin-page">
      <div className="admin-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
        <div>
          <Breadcrumbs items={breadcrumbs} />
          <h1 style={{margin:'6px 0 6px'}}>{title}</h1>
          {description && <div className="small muted">{description}</div>}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {actions}
        </div>
      </div>
      <div style={{height:16}} />
      <div className="admin-content">{children}</div>
    </div>
  )
}
