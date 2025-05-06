import { useEffect, useState } from 'react';

export function useDeviceType() {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop'
  );

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width <= 767)
        setDevice('mobile'); // móviles
      else if (width <= 1024)
        setDevice('tablet'); // tablets
      else setDevice('desktop');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return device;
}
