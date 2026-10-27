import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/config/', '/api/'], // Bloquea rutas privadas de prueba
    },
    sitemap: 'https://restaurantelempira.xyz',
  };
}
