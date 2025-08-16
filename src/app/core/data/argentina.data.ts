export interface Province {
  id: string;
  name: string;
  cities: City[];
}

export interface City {
  id: string;
  name: string;
}

export const ARGENTINA_PROVINCES: Province[] = [
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    cities: [
      { id: 'la-plata', name: 'La Plata' },
      { id: 'mar-del-plata', name: 'Mar del Plata' },
      { id: 'bahia-blanca', name: 'Bahía Blanca' },
      { id: 'tandil', name: 'Tandil' },
      { id: 'olavarria', name: 'Olavarría' },
      { id: 'pergamino', name: 'Pergamino' }
    ]
  },
  {
    id: 'caba',
    name: 'Ciudad Autónoma de Buenos Aires',
    cities: [
      { id: 'caba', name: 'Ciudad Autónoma de Buenos Aires' }
    ]
  },
  {
    id: 'cordoba',
    name: 'Córdoba',
    cities: [
      { id: 'cordoba-capital', name: 'Córdoba' },
      { id: 'rio-cuarto', name: 'Río Cuarto' },
      { id: 'villa-maria', name: 'Villa María' },
      { id: 'san-francisco', name: 'San Francisco' },
      { id: 'bell-ville', name: 'Bell Ville' }
    ]
  },
  {
    id: 'santa-fe',
    name: 'Santa Fe',
    cities: [
      { id: 'santa-fe-capital', name: 'Santa Fe' },
      { id: 'rosario', name: 'Rosario' },
      { id: 'rafaela', name: 'Rafaela' },
      { id: 'venado-tuerto', name: 'Venado Tuerto' },
      { id: 'reconquista', name: 'Reconquista' }
    ]
  },
  {
    id: 'mendoza',
    name: 'Mendoza',
    cities: [
      { id: 'mendoza-capital', name: 'Mendoza' },
      { id: 'san-rafael', name: 'San Rafael' },
      { id: 'godoy-cruz', name: 'Godoy Cruz' },
      { id: 'lujan-de-cuyo', name: 'Luján de Cuyo' }
    ]
  },
  {
    id: 'tucuman',
    name: 'Tucumán',
    cities: [
      { id: 'san-miguel-de-tucuman', name: 'San Miguel de Tucumán' },
      { id: 'tafi-viejo', name: 'Tafí Viejo' },
      { id: 'yerba-buena', name: 'Yerba Buena' },
      { id: 'concepcion', name: 'Concepción' }
    ]
  },
  {
    id: 'salta',
    name: 'Salta',
    cities: [
      { id: 'salta-capital', name: 'Salta' },
      { id: 'oran', name: 'Orán' },
      { id: 'tartagal', name: 'Tartagal' },
      { id: 'cafayate', name: 'Cafayate' }
    ]
  },
  {
    id: 'entre-rios',
    name: 'Entre Ríos',
    cities: [
      { id: 'parana', name: 'Paraná' },
      { id: 'concordia', name: 'Concordia' },
      { id: 'gualeguaychu', name: 'Gualeguaychú' },
      { id: 'concepcion-del-uruguay', name: 'Concepción del Uruguay' }
    ]
  },
  {
    id: 'misiones',
    name: 'Misiones',
    cities: [
      { id: 'posadas', name: 'Posadas' },
      { id: 'puerto-iguazu', name: 'Puerto Iguazú' },
      { id: 'oberá', name: 'Oberá' },
      { id: 'eldorado', name: 'Eldorado' }
    ]
  },
  {
    id: 'chaco',
    name: 'Chaco',
    cities: [
      { id: 'resistencia', name: 'Resistencia' },
      { id: 'barranqueras', name: 'Barranqueras' },
      { id: 'presidencia-roque-saenz-pena', name: 'Presidencia Roque Sáenz Peña' }
    ]
  },
  {
    id: 'corrientes',
    name: 'Corrientes',
    cities: [
      { id: 'corrientes-capital', name: 'Corrientes' },
      { id: 'goya', name: 'Goya' },
      { id: 'paso-de-los-libres', name: 'Paso de los Libres' },
      { id: 'mercedes', name: 'Mercedes' }
    ]
  },
  {
    id: 'santiago-del-estero',
    name: 'Santiago del Estero',
    cities: [
      { id: 'santiago-del-estero-capital', name: 'Santiago del Estero' },
      { id: 'la-banda', name: 'La Banda' },
      { id: 'termas-de-rio-hondo', name: 'Termas de Río Hondo' }
    ]
  },
  {
    id: 'formosa',
    name: 'Formosa',
    cities: [
      { id: 'formosa-capital', name: 'Formosa' },
      { id: 'clorinda', name: 'Clorinda' },
      { id: 'pirane', name: 'Pirané' }
    ]
  },
  {
    id: 'jujuy',
    name: 'Jujuy',
    cities: [
      { id: 'san-salvador-de-jujuy', name: 'San Salvador de Jujuy' },
      { id: 'palpala', name: 'Palpalá' },
      { id: 'libertador-general-san-martin', name: 'Libertador General San Martín' }
    ]
  },
  {
    id: 'la-rioja',
    name: 'La Rioja',
    cities: [
      { id: 'la-rioja-capital', name: 'La Rioja' },
      { id: 'chilecito', name: 'Chilecito' },
      { id: 'chamical', name: 'Chamical' }
    ]
  },
  {
    id: 'catamarca',
    name: 'Catamarca',
    cities: [
      { id: 'san-fernando-del-valle-de-catamarca', name: 'San Fernando del Valle de Catamarca' },
      { id: 'andalgala', name: 'Andalgalá' },
      { id: 'belen', name: 'Belén' }
    ]
  },
  {
    id: 'la-pampa',
    name: 'La Pampa',
    cities: [
      { id: 'santa-rosa', name: 'Santa Rosa' },
      { id: 'general-pico', name: 'General Pico' },
      { id: 'toay', name: 'Toay' }
    ]
  },
  {
    id: 'san-luis',
    name: 'San Luis',
    cities: [
      { id: 'san-luis-capital', name: 'San Luis' },
      { id: 'villa-mercedes', name: 'Villa Mercedes' },
      { id: 'merlo', name: 'Merlo' }
    ]
  },
  {
    id: 'san-juan',
    name: 'San Juan',
    cities: [
      { id: 'san-juan-capital', name: 'San Juan' },
      { id: 'rivadavia', name: 'Rivadavia' },
      { id: 'chimbas', name: 'Chimbas' }
    ]
  },
  {
    id: 'rio-negro',
    name: 'Río Negro',
    cities: [
      { id: 'viedma', name: 'Viedma' },
      { id: 'bariloche', name: 'San Carlos de Bariloche' },
      { id: 'general-roca', name: 'General Roca' },
      { id: 'cipolletti', name: 'Cipolletti' }
    ]
  },
  {
    id: 'neuquen',
    name: 'Neuquén',
    cities: [
      { id: 'neuquen-capital', name: 'Neuquén' },
      { id: 'cutral-co', name: 'Cutral Có' },
      { id: 'plaza-huincul', name: 'Plaza Huincul' },
      { id: 'zapala', name: 'Zapala' }
    ]
  },
  {
    id: 'chubut',
    name: 'Chubut',
    cities: [
      { id: 'rawson', name: 'Rawson' },
      { id: 'comodoro-rivadavia', name: 'Comodoro Rivadavia' },
      { id: 'puerto-madryn', name: 'Puerto Madryn' },
      { id: 'trelew', name: 'Trelew' }
    ]
  },
  {
    id: 'santa-cruz',
    name: 'Santa Cruz',
    cities: [
      { id: 'rio-gallegos', name: 'Río Gallegos' },
      { id: 'caleta-olivia', name: 'Caleta Olivia' },
      { id: 'el-calafate', name: 'El Calafate' }
    ]
  },
  {
    id: 'tierra-del-fuego',
    name: 'Tierra del Fuego',
    cities: [
      { id: 'ushuaia', name: 'Ushuaia' },
      { id: 'rio-grande', name: 'Río Grande' }
    ]
  }
];