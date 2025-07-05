// async function crawlData(browser, url: string) {
//   const page = await browser.newPage();

//   await page.goto(url);

//   // City
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[1]/td[2]',
//   );
//   const [el1] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[1]/td[2]',
//   );
//   const cityData = await el1.getProperty('textContent');
//   const city = await cityData.jsonValue().then((data: string) => data.trim());

//   // Region
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[2]/td[2]',
//   );
//   const [el2] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[2]/td[2]',
//   );
//   const regionData = await el2.getProperty('textContent');
//   const region = await regionData
//     .jsonValue()
//     .then((data: string) => data.trim());

//   //Arena
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[3]/td[2]',
//   );
//   const [el3] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[3]/td[2]',
//   );
//   const arenaData = await el3.getProperty('textContent');
//   const arena = await arenaData.jsonValue().then((data: string) => data.trim());

//   // Full name
//   await page.waitForXPath('//*[@id="contenttable"]/tbody/tr[1]/td/h2');
//   const [el4] = await page.$x('//*[@id="contenttable"]/tbody/tr[1]/td/h2');
//   const fullNameData = await el4.getProperty('textContent');
//   const clubName = await fullNameData
//     .jsonValue()
//     .then((data: string) => data.trim());

//   // Founded In
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[5]/td[2]',
//   );
//   const [el5] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[5]/td[2]',
//   );
//   const foundedInData = await el5.getProperty('textContent');
//   const foundedIn = await foundedInData
//     .jsonValue()
//     .then((data: string) => data.trim());

//   // District
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[6]/td[2]',
//   );
//   const [el6] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[6]/td[2]',
//   );
//   const districtData = await el6.getProperty('textContent');
//   const district = await districtData
//     .jsonValue()
//     .then((data: string) => data.trim());

//   // Home page
//   const [homePage] = await Promise.all(
//     (
//       await page.$x(
//         '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[7]/td[2]/a',
//       )
//     ).map(async (item) => await (await item.getProperty('href')).jsonValue()),
//   );

//   // Facebook
//   const [facebook] = await Promise.all(
//     (
//       await page.$x(
//         '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[8]/td[2]/a',
//       )
//     ).map(async (item) => await (await item.getProperty('href')).jsonValue()),
//   );

//   // Other information
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[9]/td[2]',
//   );
//   const [el9] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[9]/td[2]',
//   );
//   const otherInfoData = await el9.getProperty('textContent');
//   const otherInfo = await otherInfoData
//     .jsonValue()
//     .then((data: string) => data.trim());

//   // Club admitted
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[10]/td[2]',
//   );
//   const [el10] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[10]/td[2]',
//   );
//   const clubAdmittedData = await el10.getProperty('textContent');
//   const clubAdmitted = await clubAdmittedData
//     .jsonValue()
//     .then((data: string) => data.trim());

//   // Last updated
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[11]/td[2]',
//   );
//   const [el11] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[1]/table/tbody/tr[11]/td[2]',
//   );
//   const lastUpdatedData = await el11.getProperty('textContent');
//   const lastUpdated = await lastUpdatedData
//     .jsonValue()
//     .then((data: string) => data.trim());

//   // Logo
//   await page.waitForXPath(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[2]/table/tbody/tr/td/img[1]',
//   );
//   const [el13] = await page.$x(
//     '//*[@id="infoview"]/table/tbody/tr[1]/td[2]/table/tbody/tr/td/img[1]',
//   );
//   const logoData = await el13.getProperty('src');
//   const logoUrl = await logoData
//     .jsonValue()
//     .then((data: string) => data.trim());

//   const data: ClubDto = {
//     city,
//     region,
//     arena,
//     clubName,
//     foundedIn,
//     district,
//     homePage,
//     facebook,
//     otherInfo,
//     clubAdmitted,
//     lastUpdated,
//     logoUrl,
//   };
//   return data;
// }

// async function saveClubDataToDb() {
//   for (let i = 1; i <= 8000; i++) {
//     const browser = await puppeteer.launch({ headless: false });

//     const data = await this.crawlData(
//       browser,
//       `http://svenskafotbollsklubbar.se/showclub.php?clubid=${i}`,
//     );
//     if (data.clubName) {
//       await db.collection('clubs').add({
//         city: data.city === '' || data.city === 'Saknas' ? null : data.city,
//         region:
//           data.region === '' || data.region === 'Saknas' ? null : data.region,
//         arena: data.arena === '' || data.arena === 'Saknas' ? null : data.arena,
//         clubName: data.clubName,
//         foundedIn:
//           data.foundedIn === '' || data.foundedIn === 'Saknas'
//             ? null
//             : data.foundedIn,
//         district:
//           data.district === '' || data.district === 'Saknas'
//             ? null
//             : data.district,
//         homePage:
//           !data.homePage || data.homePage === 'Hemsida saknas'
//             ? null
//             : data.homePage,
//         facebook:
//           !data.facebook || data.facebook === 'Facebook sida saknas'
//             ? null
//             : data.facebook,
//         otherInfo:
//           data.otherInfo === '' || data.otherInfo === 'Saknas'
//             ? null
//             : data.otherInfo,
//         clubAdmitted:
//           data.clubAdmitted === '' || data.clubAdmitted === 'Saknas'
//             ? null
//             : data.clubAdmitted,
//         lastUpdated:
//           data.lastUpdated === '' || data.lastUpdated === 'Saknas'
//             ? null
//             : data.lastUpdated,
//         logoUrl: data.logoUrl === '' ? null : data.logoUrl,
//       });
//     }
//     await browser.close();
//   }
// }
