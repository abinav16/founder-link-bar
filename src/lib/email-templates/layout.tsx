import * as React from 'react';
import { Img, Link, Row, Column, Hr, Text } from '@react-email/components';

export const emailStyles = {
  main: { backgroundColor: '#ffffff', color: '#111111', fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif", fontStyle: 'normal' as const, letterSpacing: '0' },
  container: { maxWidth: '600px', padding: '40px 24px' },
  h1: { fontSize: '32px', lineHeight: '1.2', fontWeight: '700', color: '#111111', margin: '0 0 24px' },
  text: { fontSize: '15px', color: '#666666', lineHeight: '1.7', margin: '0 0 20px' },
  link: { color: '#111111', textDecoration: 'underline' },
  button: { backgroundColor: '#111111', color: '#ffffff', fontSize: '14px', fontWeight: '600', borderRadius: '6px', padding: '14px 22px', textDecoration: 'none' },
  footer: { fontSize: '12px', lineHeight: '1.7', color: '#666666', margin: '28px 0 0' },
  codeStyle: { fontFamily: 'Courier,monospace', fontSize: '30px', fontWeight: '700', color: '#111111', margin: '0 0 24px' },
};

export function EmailBrand() {
  return <><Row><Column style={{width:'44px'}}><Link href="https://startupbar.co"><Img src="https://startupbar.co/favicon.png" width="36" height="36" alt="StartupBar" /></Link></Column><Column style={{fontSize:'19px',fontWeight:700,color:'#111111'}}>StartupBar</Column></Row><Hr style={{borderColor:'#e5e5e5',margin:'26px 0 32px'}} /></>;
}

export function EmailSignoff() {
  return <><Text style={{fontSize:'14px',fontWeight:600,color:'#111111',margin:'28px 0 24px'}}>Founders helping founders.</Text><Hr style={{borderColor:'#e5e5e5',margin:'0 0 22px'}} /><Text style={{...emailStyles.footer,margin:0}}><Link href="https://startupbar.co" style={emailStyles.link}>StartupBar</Link> · <Link href="https://startupbar.co/privacy" style={emailStyles.link}>Privacy</Link></Text></>;
}