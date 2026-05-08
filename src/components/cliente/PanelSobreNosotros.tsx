export default function PanelSobreNosotros() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📖 Sobre Nosotros</h1>
      
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
        <div className="h-48 bg-gradient-to-r from-orange-500 to-red-600"></div>
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-4">Restaurante Lempira</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Fundado en 2010, Restaurante Lempira nació con la visión de llevar los auténticos 
            sabores de Honduras a cada mesa. Nuestro nombre es un homenaje a la moneda 
            hondureña y a la riqueza cultural de nuestro país.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Desde nuestros inicios, nos hemos comprometido a usar ingredientes frescos y 
            locales, preparando cada plato con el cariño y la tradición que nos caracteriza. 
            Nuestra cocina combina recetas familiares transmitidas por generaciones con 
            técnicas modernas.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Hoy, Restaurante Lempira es un punto de encuentro para amantes de la buena 
            comida, donde cada cliente es tratado como parte de nuestra familia. Nos 
            enorgullece ofrecer una experiencia gastronómica única que celebra lo mejor 
            de nuestra tierra.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="font-bold text-xl mb-2">Misión</h3>
          <p className="text-gray-600">
            Ofrecer la mejor experiencia gastronómica con sabores auténticos, utilizando 
            ingredientes frescos y de calidad, superando las expectativas de nuestros clientes.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
          <div className="text-4xl mb-3">👁️</div>
          <h3 className="font-bold text-xl mb-2">Visión</h3>
          <p className="text-gray-600">
            Ser el restaurante referente de la gastronomía hondureña, reconocido por nuestra 
            excelencia culinaria y servicio, expandiendo nuestra tradición a más ciudades.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4">
          <div className="text-3xl font-bold text-orange-600">15+</div>
          <div className="text-gray-500">Años de experiencia</div>
        </div>
        <div className="text-center p-4">
          <div className="text-3xl font-bold text-orange-600">50+</div>
          <div className="text-gray-500">Platos en nuestro menú</div>
        </div>
        <div className="text-center p-4">
          <div className="text-3xl font-bold text-orange-600">10k+</div>
          <div className="text-gray-500">Clientes satisfechos</div>
        </div>
      </div>
    </div>
  )
}