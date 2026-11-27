// Lecturas y referencias por demo. Todas verificadas en PubMed (PMID y DOI).
// oa: texto completo gratuito (PubMed Central).
const R = {
  durrer: { a: 'Durrer D, van Dam RT, Freud GE, et al.', t: 'Total excitation of the isolated human heart.', j: 'Circulation', y: 1970, v: '41(6):899-912', doi: '10.1161/01.cir.41.6.899', pmid: '5482907' },
  kligfield: { a: 'Kligfield P, Gettes LS, Bailey JJ, et al.', t: 'Recommendations for the standardization and interpretation of the electrocardiogram: part I: the electrocardiogram and its technology.', j: 'Circulation', y: 2007, v: '115(10):1306-24', doi: '10.1161/CIRCULATIONAHA.106.180200', pmid: '17322457' },
  bp3d: { a: 'Mitsuhashi N, Fujieda K, Tamura T, et al.', t: 'BodyParts3D: 3D structure database for anatomical concepts.', j: 'Nucleic Acids Res', y: 2009, v: '37:D782-5', doi: '10.1093/nar/gkn613', pmid: '18835852', oa: true },
  jubran: { a: 'Jubran A.', t: 'Pulse oximetry.', j: 'Crit Care', y: 2015, v: '19:272', doi: '10.1186/s13054-015-0984-8', pmid: '26179876', oa: true },
  chan: { a: 'Chan ED, Chan MM, Chan MM.', t: 'Pulse oximetry: understanding its basic principles facilitates appreciation of its limitations.', j: 'Respir Med', y: 2013, v: '107(6):789-99', doi: '10.1016/j.rmed.2013.02.004', pmid: '23490227' },
  sjoding: { a: 'Sjoding MW, Dickson RP, Iwashyna TJ, et al.', t: 'Racial bias in pulse oximetry measurement.', j: 'N Engl J Med', y: 2020, v: '383(25):2477-8', doi: '10.1056/NEJMc2029240', pmid: '33326721', oa: true },
  ins2024: { a: 'Nickel B, Gorski L, Kleidon T, et al.', t: 'Infusion Therapy Standards of Practice, 9th Edition.', j: 'J Infus Nurs', y: 2024, v: '47(1S Suppl 1):S1-S285', doi: '10.1097/NAN.0000000000000532', pmid: '38211609' },
  helm: { a: 'Helm RE, Klausner JD, Klemperer JD, et al.', t: 'Accepted but unacceptable: peripheral IV catheter failure.', j: 'J Infus Nurs', y: 2015, v: '38(3):189-203', doi: '10.1097/NAN.0000000000000100', pmid: '25871866' },
  ochs: { a: 'Ochs M, Nyengaard JR, Jung A, et al.', t: 'The number of alveoli in the human lung.', j: 'Am J Respir Crit Care Med', y: 2004, v: '169(1):120-4', doi: '10.1164/rccm.200308-1107OC', pmid: '14512270' },
  weibel: { a: 'Weibel ER.', t: 'Lung morphometry: the link between structure and function.', j: 'Cell Tissue Res', y: 2017, v: '367(3):413-26', doi: '10.1007/s00441-016-2541-4', pmid: '27981379' },
  hess: { a: 'Hess DR.', t: 'Respiratory mechanics in mechanically ventilated patients.', j: 'Respir Care', y: 2014, v: '59(11):1773-94', doi: '10.4187/respcare.03410', pmid: '25336536' },
  escamilla: { a: 'Escamilla RF.', t: 'Knee biomechanics of the dynamic squat exercise.', j: 'Med Sci Sports Exerc', y: 2001, v: '33(1):127-41', doi: '10.1097/00005768-200101000-00020', pmid: '11194098' },
  hart: { a: 'Hart HF, Patterson BE, Crossley KM, et al.', t: 'May the force be with you: understanding how patellofemoral joint reaction force compares across different activities and physical interventions — a systematic review and meta-analysis.', j: 'Br J Sports Med', y: 2022, v: '56(9):521-30', doi: '10.1136/bjsports-2021-104686', pmid: '35115309' },
  song: { a: 'Song K, Scattone Silva R, Hullfish TJ, et al.', t: 'Patellofemoral joint loading progression across 35 weightbearing rehabilitation exercises and activities of daily living.', j: 'Am J Sports Med', y: 2023, v: '51(8):2110-9', doi: '10.1177/03635465231175160', pmid: '37272685', oa: true },
  otto: { a: 'Otto CM, Nishimura RA, Bonow RO, et al.', t: '2020 ACC/AHA Guideline for the management of patients with valvular heart disease.', j: 'Circulation', y: 2021, v: '143(5):e72-e227', doi: '10.1161/CIR.0000000000000923', pmid: '33332150' },
  kadaba: { a: 'Kadaba MP, Ramakrishnan HK, Wootten ME, et al.', t: 'Repeatability of kinematic, kinetic, and electromyographic data in normal adult gait.', j: 'J Orthop Res', y: 1989, v: '7(6):849-60', doi: '10.1002/jor.1100070611', pmid: '2795325' },
  baker: { a: 'Baker R.', t: 'Gait analysis methods in rehabilitation.', j: 'J Neuroeng Rehabil', y: 2006, v: '3:4', doi: '10.1186/1743-0003-3-4', pmid: '16512912', oa: true },
  ardsnet: { a: 'Acute Respiratory Distress Syndrome Network; Brower RG, Matthay MA, et al.', t: 'Ventilation with lower tidal volumes as compared with traditional tidal volumes for acute lung injury and the acute respiratory distress syndrome.', j: 'N Engl J Med', y: 2000, v: '342(18):1301-8', doi: '10.1056/NEJM200005043421801', pmid: '10793162' },
  amato: { a: 'Amato MBP, Meade MO, Slutsky AS, et al.', t: 'Driving pressure and survival in the acute respiratory distress syndrome.', j: 'N Engl J Med', y: 2015, v: '372(8):747-55', doi: '10.1056/NEJMsa1410639', pmid: '25693014' },
  muntner: { a: 'Muntner P, Shimbo D, Carey RM, et al.', t: 'Measurement of blood pressure in humans: a scientific statement from the American Heart Association.', j: 'Hypertension', y: 2019, v: '73(5):e35-e66', doi: '10.1161/HYP.0000000000000087', pmid: '30827125', oa: true },
  pickering: { a: 'Pickering TG, Hall JE, Appel LJ, et al.', t: 'Recommendations for blood pressure measurement in humans and experimental animals: part 1: blood pressure measurement in humans.', j: 'Circulation', y: 2005, v: '111(5):697-716', doi: '10.1161/01.CIR.0000154900.76284.F6', pmid: '15699287' },
  panchal: { a: 'Panchal AR, Bartos JA, Cabañas JG, et al.', t: 'Part 3: Adult basic and advanced life support: 2020 American Heart Association guidelines for cardiopulmonary resuscitation and emergency cardiovascular care.', j: 'Circulation', y: 2020, v: '142(16 Suppl 2):S366-S468', doi: '10.1161/CIR.0000000000000916', pmid: '33081529' },
  soar: { a: 'Soar J, Böttiger BW, Carli P, et al.', t: 'European Resuscitation Council Guidelines 2021: adult advanced life support.', j: 'Resuscitation', y: 2021, v: '161:115-51', doi: '10.1016/j.resuscitation.2021.02.010', pmid: '33773825' },
  valenzuela: { a: 'Valenzuela TD, Roe DJ, Nichol G, et al.', t: 'Outcomes of rapid defibrillation by security officers after cardiac arrest in casinos.', j: 'N Engl J Med', y: 2000, v: '343(17):1206-9', doi: '10.1056/NEJM200010263431701', pmid: '11071670' },
  masonlikar: { a: 'Mason RE, Likar I.', t: 'A new system of multiple-lead exercise electrocardiography.', j: 'Am Heart J', y: 1966, v: '71(2):196-205', doi: '10.1016/0002-8703(66)90182-7', pmid: '5902099' },
  batchvarov: { a: 'Batchvarov VN, Malik M, Camm AJ.', t: 'Incorrect electrode cable connection during electrocardiographic recording.', j: 'Europace', y: 2007, v: '9(11):1081-90', doi: '10.1093/europace/eum198', pmid: '17932025' }
};
// por demo: [clave, qué aporta (es), qué aporta (en)]
const BY = {
  corazon: [['durrer', 'El estudio clásico que midió en corazones humanos el orden y los tiempos de activación eléctrica.', 'The classic study that mapped the order and timing of electrical activation in human hearts.'],
    ['kligfield', 'Estándar de AHA/ACC/HRS sobre cómo se registra y presenta el electrocardiograma.', 'AHA/ACC/HRS standard on how the ECG is recorded and displayed.']],
  pulsioximetro: [['jubran', 'Revisión del funcionamiento del pulsioxímetro y sus usos en cuidados críticos.', 'Review of how pulse oximeters work and their use in critical care.'],
    ['chan', 'Explica la absorción de la luz roja e infrarroja y por qué la lectura puede fallar.', 'Explains red/infrared absorption and why readings can be wrong.'],
    ['sjoding', 'Muestra que el pulsioxímetro puede sobrestimar la saturación en pacientes de piel oscura.', 'Shows pulse oximeters can overestimate saturation in patients with darker skin.']],
  goteo: [['ins2024', 'Estándares internacionales de enfermería para terapia intravenosa (9.ª edición).', 'International nursing standards for infusion therapy (9th edition).'],
    ['helm', 'Por qué fallan los catéteres periféricos y cómo prevenirlo.', 'Why peripheral IV catheters fail and how to prevent it.']],
  pulmones: [['ochs', 'Cuenta los alvéolos del pulmón humano: unos 480 millones en promedio.', 'Counts the alveoli in the human lung: about 480 million on average.'],
    ['weibel', 'Relación entre la estructura del pulmón y el intercambio de gases.', 'How lung structure relates to gas exchange.'],
    ['hess', 'Distensibilidad, resistencia y presiones de la vía aérea, explicadas paso a paso.', 'Compliance, resistance and airway pressures explained step by step.']],
  rodilla: [['escamilla', 'Fuerzas en la rodilla durante la sentadilla según el ángulo de flexión.', 'Knee forces during the squat across flexion angles.'],
    ['hart', 'Metaanálisis: fuerza en la articulación patelofemoral al caminar, subir escaleras, correr y en sentadilla.', 'Meta-analysis of patellofemoral joint force in walking, stairs, running and squats.'],
    ['song', 'Carga patelofemoral en 35 ejercicios de rehabilitación: hasta 8,2 veces el peso corporal.', 'Patellofemoral load in 35 rehab exercises: up to 8.2 times body weight.']],
  valvulas: [['otto', 'Guía ACC/AHA sobre enfermedad valvular, incluidas estenosis aórtica e insuficiencia mitral.', 'ACC/AHA guideline on valvular disease, including aortic stenosis and mitral regurgitation.']],
  marcha: [['kadaba', 'Curvas normales de cinemática, cinética y electromiografía de la marcha adulta.', 'Normal kinematic, kinetic and EMG curves of adult gait.'],
    ['baker', 'Métodos de análisis de la marcha en rehabilitación.', 'Gait analysis methods in rehabilitation.']],
  ventilador: [['ardsnet', 'Ensayo que demostró que volúmenes corrientes bajos (6 mL/kg) reducen la mortalidad.', 'Trial showing low tidal volumes (6 mL/kg) reduce mortality.'],
    ['amato', 'La presión de distensión (meseta − PEEP) como mejor predictor de supervivencia.', 'Driving pressure (plateau − PEEP) as the best predictor of survival.'],
    ['hess', 'Cómo interpretar presión pico, meseta, distensibilidad y resistencia en el ventilador.', 'How to read peak and plateau pressure, compliance and resistance on the ventilator.']],
  tensiometro: [['muntner', 'Declaración científica de la AHA sobre cómo medir bien la presión arterial.', 'AHA scientific statement on accurate blood pressure measurement.'],
    ['pickering', 'Recomendaciones AHA: ruidos de Korotkoff, tamaño del brazalete y técnica.', 'AHA recommendations: Korotkoff sounds, cuff size and technique.']],
  desfibrilador: [['panchal', 'Guías AHA 2020 de soporte vital básico y avanzado en adultos.', 'AHA 2020 adult basic and advanced life support guidelines.'],
    ['soar', 'Guías del Consejo Europeo de Resucitación 2021.', 'European Resuscitation Council Guidelines 2021.'],
    ['valenzuela', 'Desfibrilación rápida por personal no médico: hasta 74 % de supervivencia si es en 3 minutos.', 'Rapid defibrillation by lay rescuers: up to 74% survival within 3 minutes.']],
  ecg: [['kligfield', 'Estándar de AHA/ACC/HRS: derivaciones, colocación de electrodos y registro.', 'AHA/ACC/HRS standard: leads, electrode placement and recording.'],
    ['masonlikar', 'El artículo original de la colocación de electrodos de extremidades en el torso.', 'The original paper on placing limb electrodes on the torso.'],
    ['batchvarov', 'Cómo reconocer electrodos intercambiados en el electrocardiograma.', 'How to recognise swapped electrodes on the ECG.']]
};
const ALIAS = { heart: 'corazon', 'pulse-oximeter': 'pulsioximetro', 'iv-drip': 'goteo', lungs: 'pulmones', knee: 'rodilla', 'heart-valves': 'valvulas', gait: 'marcha', ventilator: 'ventilador', 'blood-pressure': 'tensiometro', defibrillator: 'desfibrilador', 'ecg-12-lead': 'ecg' };
export function refsFor(slug) {
  const k = ALIAS[slug] || slug; const list = (BY[k] || []).map(([id, es, en]) => ({ ...R[id], es, en }));
  if (list.length) list.push({ ...R.bp3d, es: 'La base de datos de anatomía 3D de donde vienen los modelos de esta demo.', en: 'The 3D anatomy database the models in this demo come from.' });
  return list;
}
