/*
 * CareConnect - Платформа за Домашен Социален Патронаж
 * Copyright (C) 2026 Адам Биков , Реджеб Туджар
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */


import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Incident } from '../types';

const incidentsCollection = collection(db, 'incidents');

export async function addIncident(incident: Omit<Incident, 'id' | 'status' | 'date'>): Promise<string> {
  const payload = {
    ...incident,
    date: new Date().toISOString(),
    status: 'Open'
  };
  const docRef = await addDoc(incidentsCollection, payload);
  return docRef.id;
}

export async function getOpenIncidents(): Promise<Incident[]> {
  const q = query(incidentsCollection, where('status', 'in', ['Open', 'Escalated']));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data() as Omit<Incident, 'id'>;
    return {
      id: docSnapshot.id,
      ...data
    };
  });
}
