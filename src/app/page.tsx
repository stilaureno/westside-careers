import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #2b0f17 0%, #4a1521 26%, #6f1d2b 58%, #2b0f17 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '22px',
        boxShadow: '0 18px 42px rgba(4,12,24,.34)',
        padding: '40px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid rgba(212,175,55,.22)',
      }}>
        <img
          src="/WESTSIDE LOGO COLORED.png"
          alt="NWR Careers Logo"
          style={{ width: '160px', margin: '0 auto 24px', display: 'block' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link href="/apply" style={{
            display: 'block',
            padding: '14px 24px',
            background: '#8b1e2d',
            color: '#fff',
            borderRadius: '12px',
            fontWeight: '700',
            textDecoration: 'none',
            fontSize: '15px',
          }}>
            Apply Now
          </Link>
          <Link href="/status" style={{
            display: 'block',
            padding: '14px 24px',
            background: '#fff',
            color: '#8b1e2d',
            border: '2px solid #8b1e2d',
            borderRadius: '12px',
            fontWeight: '700',
            textDecoration: 'none',
            fontSize: '15px',
          }}>
            Check Application Status
          </Link>
          <Link href="/exam" style={{
            display: 'block',
            padding: '14px 24px',
            background: '#fff',
            color: '#8b1e2d',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            fontWeight: '700',
            textDecoration: 'none',
            fontSize: '15px',
          }}>
            Take Math Exam
          </Link>
        </div>
      </div>
    </div>
  );
}
