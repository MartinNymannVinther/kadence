/**
 * A rider's page at Cykling Danmark's member portal, in the shape the
 * portal serves it (seen 1 October 2026): a heading per discipline, class
 * and year, a row per result, a total. The rider is made up; the races
 * are real Danish races of 2025 and 2026, as public as any race calendar.
 */

export const UCI = "10012345678";

const row = (race: string, event: number, round: number | null, date: string, place: string) => {
  const href = `https://www.sportstiming.dk/event/${event}/results${round ? `?round=${round}` : ""}`;
  return `
				<tr>
					<td>
							<a href="${href}" target="_blank" rel="noopener">${race}</a>
					</td>
					<td>
						&nbsp;
					</td>
					<td>${date}&nbsp;</td>
					<td class="text-right">
							<a href="${href}" target="_blank" rel="noopener">${place}</a>
						&nbsp;
					</td>
					<td class="text-right">2&nbsp;</td>
				</tr>`;
};

const heading = (title: string) => `
					<tr style="background-color:#f4f4f4;">
						<th colspan="2">${title}</th>
						<th>Dato</th>
						<th class="text-right">Placering</th>
						<th class="text-right">Point</th>
					</tr>`;

const total = `
					<tr>
							<th colspan="2"><b>Total</b></th>
							<th></th><th></th>
							<th class="text-right"><b>24</b></th>
					</tr>`;

export function profilePage(rows: string, uci = UCI, born = 2011): string {
  const printed = `${uci.slice(0, 3)} ${uci.slice(3, 6)} ${uci.slice(6, 9)} ${uci.slice(9)}`;
  return `<!DOCTYPE html><html><body>
<section>
	<div class="container">
		<h1><img src="/assets/images/flags/dk.png" style="width:20px;"> Test Rytter</h1>
		M, ${born}
		<br/>UCI ID ${printed}
	</div>
</section>
<div class="container">
	<table class="table table-hover">
		<tbody>${rows}
		</tbody>
	</table>
</div></body></html>`;
}

export const PAGE = profilePage(
  heading("Landevej - U17 (2026)") +
    row("Demin Cup Finalen 2026 - Holb&#230;k CS", 17626, 101613, "13. september 2026", "14") +
    row("Greve CC 2026", 17614, 101512, "6. september 2026", "6") +
    row("B&amp;U DM Linjel&#248;b - Vejle CK 2026", 17480, 100581, "30. august 2026", "18") +
    row("CAMPIONE HOLSTEBRO TOURS 2026 -1. ETAPE - Landevejsl&#248;b/Road Race", 19086, 110561, "30. juli 2026", "65") +
    row("CAMPIONE HOLSTEBRO TOURS 2026 - Point Samlet", 19292, 111229, "30. juli 2026", "47") +
    row("Amager CR - Vitamin Well Grand Prix 2026", 17500, 100700, "21. juni 2026", "DNF") +
    total +
    heading("Landevej - U15 (2025)") +
    row("Future Racing 2025", 16000, null, "15. juni 2025", "9") +
    total +
    heading("Landevej - U13 (2023)") +
    row("Sorø Cykelløb 2023", 13000, 90000, "3. maj 2023", "5") +
    total,
); // prettier-ignore

export { row, heading };
