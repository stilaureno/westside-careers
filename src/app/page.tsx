import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #08111f 0%, #0d1a2f 26%, #10213b 58%, #0a1424 100%)',
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
          alt="Westside Careers Logo"
          style={{ width: '160px', margin: '0 auto 24px', display: 'block' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link href="/apply" style={{
            display: 'block',
            padding: '14px 24px',
            background: '#163a70',
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
            color: '#163a70',
            border: '2px solid #163a70',
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
            color: '#163a70',
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