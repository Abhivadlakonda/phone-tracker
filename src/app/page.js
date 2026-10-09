import dynamic from 'next/dynamic';

const MapDashboard = dynamic(() => import('@/components/MapDashboard'), {
  ssr: false,
  loading: () => (
    <div className="loading">
      <div className="spinner" />
      Loading map...
    </div>
  ),
});

export default function Home() {
  return <MapDashboard />;
}
