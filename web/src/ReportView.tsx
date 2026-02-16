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


import React from 'react';
import { Client, Driver } from './types';

interface ReportViewProps {
  clients: Client[];
  drivers: Driver[];
}

// Helper to find driver name by ID
const getDriverInfo = (driverId: string, drivers: Driver[]) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.name} (${driver.routeArea})` : 'Неназначен';
};

// Helper to format the status for the report
const formatStatus = (lastCheckIn: string | undefined) => {
    if (!lastCheckIn) return 'Няма отчет';

    const normalized = lastCheckIn.trim();
    const normalizedUpper = normalized.toUpperCase();

    if (normalizedUpper.startsWith('INCIDENT:')) {
        const payload = normalized.slice(normalizedUpper.indexOf('INCIDENT:') + 'INCIDENT:'.length).trim();
        const isoMatch = payload.match(/\d{4}-\d{2}-\d{2}T[^\s]+/);
        const timestamp = isoMatch ? isoMatch[0] : '';
        const incidentType = isoMatch ? payload.replace(timestamp, '').trim() : payload;
        const formattedDate = timestamp
            ? new Date(timestamp).toLocaleString('bg-BG', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
              })
            : 'неизвестно време';

        return `Сигнал: ${incidentType || 'Непознат тип'} (${formattedDate})`;
    }

    if (normalizedUpper.startsWith('SOS')) {
        const payload = normalized.replace(/^SOS\s*/i, '');
        return `Сигнал: SOS (${payload || 'неизвестно време'})`;
    }

    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString('bg-BG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return normalized;
};

const formatNextVisitDate = (value?: string | null) => {
    if (!value) {
        return 'Няма насрочено';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Няма насрочено';
    }
    return date.toLocaleDateString('bg-BG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// The main report component
const ReportView: React.FC<ReportViewProps> = ({ clients, drivers }) => {
    return (
        <div className="report-container" style={{ padding: '40px', fontFamily: 'Arial, sans-serif', fontSize: '11pt', margin: '0 auto', maxWidth: '800px' }}>
            <h1 style={{ fontSize: '24pt', fontWeight: 'bold', marginBottom: '10pt', color: '#1E40AF' }}>
                Месечен Отчет
            </h1>
            <p style={{ marginBottom: '20pt', borderBottom: '1px solid #ccc', paddingBottom: '5pt' }}>
                Дата на генериране: {new Date().toLocaleDateString('bg-BG')}
            </p>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15pt' }}>
                <thead>
                    <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '2px solid #D1D5DB' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Име на Клиента</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Адрес</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Телефон</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Дата на посещение</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Последен Отчет</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Назначен Шофьор</th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map(client => (
                        <tr key={client.id} style={{ borderBottom: '1px solid #EEE' }}>
                            <td style={{ padding: '8px' }}>{client.name}</td>
                            <td style={{ padding: '8px', fontSize: '10pt' }}>{client.address}</td>
                            <td style={{ padding: '8px' }}>{client.phone}</td>
                            <td style={{ padding: '8px' }}>{formatNextVisitDate((client as any).nextVisitDate)}</td>
                            <td
                                style={{
                                    padding: '8px',
                                    color:
                                        client.lastCheckIn &&
                                        (/^SOS\s/i.test(client.lastCheckIn) ||
                                            client.lastCheckIn.trim().toUpperCase().startsWith('INCIDENT:'))
                                            ? 'red'
                                            : 'green'
                                }}
                            >
                                {formatStatus(client.lastCheckIn)}
                            </td>
                            <td style={{ padding: '8px', fontSize: '10pt' }}>
                                {getDriverInfo(client.assignedDriverId, drivers)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
             <p style={{ marginTop: '40pt', fontSize: '10pt', color: '#6B7280', borderTop: '1px solid #eee', paddingTop: '10pt' }}>
                Този документ е автоматично генериран от системата CareConnect.
            </p>
        </div>
    );
};

export default ReportView;