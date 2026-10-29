import React, {useEffect,useState} from 'react';
export default function ScreenSettings(){
 const api=(window as any).NotreMaisonScreen;
 const [config,setConfig]=useState(()=>api.read()),[message,setMessage]=useState('');
 useEffect(()=>{const update=()=>setMessage(api.status().error||'');window.addEventListener('nm-screen-change',update);return()=>window.removeEventListener('nm-screen-change',update);},[]);
 const change=(key:string,value:any)=>setConfig({...config,[key]:value});
 return <section className="screen-settings"><h3>Écran de cette tablette</h3>
 <p>Réglage local, indépendant des tâches et du retour automatique au portail.</p>
 <label>Gestion de l’écran<select value={config.mode} onChange={e=>change('mode',e.target.value)}><option value="fully">Fully Kiosk — recommandé sur la tablette</option><option value="browser">Navigateur seul — Chrome</option></select></label>
 {config.mode==='fully'?<>
 <p>Le maintien allumé du navigateur est désactivé. Fully assure l’assombrissement et l’extinction.</p>
 <label><input type="checkbox" checked={config.enabled} onChange={e=>change('enabled',e.target.checked)}/>Piloter Fully avec les horaires ci-dessous</label>
 <p>Interface Fully : {api.available()?'disponible':'non disponible — activer Enable JavaScript Interface dans Fully'}. Détection de mouvement et autorisation caméra à activer dans Fully. Désactiver ses délais Screensaver Timer et Screen Off Timer et sa programmation de veille pour laisser une seule règle agir.</p>
 <label>Inactivité avant veille, en minutes<input type="number" min="1" max="120" value={config.idleMinutes} onChange={e=>change('idleMinutes',Number(e.target.value))}/></label>
 <label>Début de journée<input type="time" value={config.dayStart} onChange={e=>change('dayStart',e.target.value)}/></label>
 <label>Début de nuit<input type="time" value={config.nightStart} onChange={e=>change('nightStart',e.target.value)}/></label>
 <label>Luminosité normale, de 1 à 255<input type="number" min="1" max="255" value={config.brightness} onChange={e=>change('brightness',Number(e.target.value))}/></label>
 <label>Luminosité assombrie<input type="number" min="1" max="254" value={config.dimBrightness} onChange={e=>change('dimBrightness',Number(e.target.value))}/></label>
 <p>Par défaut : 6 h–22 h, assombrissement après 5 minutes ; 22 h–6 h, extinction après 5 minutes. Un mouvement réveille et relance le délai, y compris la nuit. À 22 h, l’écran s’éteint si les 5 minutes sont déjà écoulées. Heure locale de la tablette : choisir Europe/Paris dans Android.</p>
 </>:<><label><input type="checkbox" checked={config.browserAwake} onChange={e=>change('browserAwake',e.target.checked)}/>Maintenir l’écran allumé dans Chrome</label><p>Cette option ne gère ni la caméra ni le réveil d’un écran éteint.</p></>}
 <button type="button" onClick={()=>{try{setConfig(api.save(config));setMessage('Réglages écran enregistrés sur cet appareil.');}catch(e:any){setMessage(e.message);}}}>Appliquer les réglages écran</button>
 {message&&<p role="status">{message}</p>}
 </section>;
}
