[Docs Link](https://developer.android.com/health-and-fitness/guides/health-connect/plan/data-types)
So health connect have various data types that you can store in backend.

## Categories

- **Activity:** This captures any activity that a user does. It can include health and fitness activities like running and swimming.
- **Body Measurement:** This captures common data related to the body, such as a user's weight and their basal metabolic rate.
- **Cycle Tracking:** This captures menstrual cycles and related data points, such as the binary result of an ovulation test
- **Nutrition:** This captures hydration and nutrition data types. The former represents how much water a user consume in a single drink. The latter includes optional fields such as calories, sugar, and magnesium
- **Sleep:** This captures interval data related to a user's length and type of sleep
- **Vitals:** This captures essential information about the user's general health. It includes data such as body temperature, blood glucose, blood pressure, and blood oxygen saturation.

## Format of these categories

All of the categories have a parent class named as Record.
There are some properties that are generic like time,zoneOffset
Like Nutrition,Activity can have these time and zoneOffset as their property name
But other are specific like title that will be unique for each categories and there can be many more properties other than title that are specific like count,percentage.
Now values of these filed's are simple like string,int etc.It can also have complex field type like  [`Instant`](https://developer.android.com/reference/java/time/Instant) which can have fields like EPOCH,MAX,MIN etc.
Data i health connect api have Metadata property that tells us a lot about data like it's origin
,how it's being collected? For example For data actively recorded by the user we have value :1,For data recorded passively by a device without user explicitly initiating the recording, or whenever it cannot be determined has a value :2 and so on Read it [here](https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/metadata/Metadata#summary).

##### Some List of Metadata properties:

- **Health Connect ID:** Each point of data is assigned with a unique identifier (UID) upon creation.
- **Data origin:** Health Connect stores information about the app where the data came from. It contains the package name of that origin, which is automatically added upon creation.

##### Place where we will store data is :

We have a users collection inside of this collection we have userId each user docs will have a sub collection that is healthIntegrationData . In this sub collection named we can have multiple sub collections like healthConnect(google) ,healthKit(apple version),samsung and many more. For now we will storing data in the healthConnect sub collection. In the healthConnect also we have another sub collection named as daily_summaries.
In the daily_summaries i have docs identified by date to have cheaper read operations.
so flow is
users->healthIntegrationData->healthConnect->daily_summaries
/users/{userId}/healthIntegrationData/healthConnect/daily_summaries/{YYYY-MM-DD}/

##### How you will be retriving data:

Each docs is going to have data about health so to get the data all you need to do is
/path/{name of data type you want to get}?date=yyy-mm-dd
example
/healthIntegeration/health-connect/active-calories?date=2025-06-05

##### Folder Structure is :

health-integration/
├── controllers/
│ ├── health-integration.controller.ts
│ ├── healthconnect.controller.ts
│ └── healthkit.controller.ts
├── dto/
│ └── ...
├── health-integration.module.ts
├── services/
│ └── health-integration.service.ts

##### DataType that i will be storing are

###### 1)ActiveCaloriesBurnedRecord

(for now we will storing how much calories a user burn in a day so we can show 7 days and each day how many calories are burned)
Chat gpt gave me this structure that will be given to me by our flutter app :
{
"energy": {
"value": 150.0,
"unit": "kcal"
},
"startTime": "2025-06-05T08:00:00Z",
"startZoneOffset": "+05:30",
"endTime": "2025-06-05T09:00:00Z",
"endZoneOffset": "+05:30",
"metadata": {
"device": {
"type": "watch",
"manufacturer": "BrandX",
"model": "ModelY"
}
}
}

- \*You will receive multiple such records in a day\*\*, so your backend must aggregate them per user per day.

So i have created a format where we are having a code that will add the above metadata to the database backend function name is -:storeActiveCaloriesBurned line number 7 of file src/modules/healthIntegeration/services/healthconnect.service.ts. Here what i have done is that we are checking the date and then uploading data if the data is already there on that date then we are just adding to it else create a new doc. The thing is if we receive a time frame that is between days like 11:59pm to 12:01 am of another day then we are splitting it between two days here is the example code
`const caloriesFirstDay =`

`dto.energy.value * (firstDuration / totalDuration);`

`const caloriesSecondDay =`

`dto.energy.value * (secondDuration / totalDuration);`

###### 2)BMR

The bmr is the number of calories your body needs to accomplish its most basic (basal) life-sustaining functions like breathing, circulation, cell production, etc., **while at rest**.

Now chagt told me the frontend Structure that i will receive is

{
"time": "2025-06-05T08:00:00.000Z",
"basalMetabolicRate": {
"value": 1.2,
"unit": "kcal_per_hour"
},
"metadata": {
"source": "GoogleFit",
"recordId": "12345"
}
}

First i created a file named as src/modules/healthIntegeration/dto/GoogleConnect/BasicMetabolicRateRecord.dto.ts and class BasalMetabolicRateRecordDto
_Keep in mind i am doing this -: **If multiple `BasalMetabolicRateRecord` entries come in for the same day**, you want to **store only the average value per day** (not a list of all records).just like we were aggregating for activecalories _

This time we are not handling that case where we may get active calories value within two days starting in one and ending in another so no need to worry about this as it is
**Instantaneous point-in-time** and not duration based

###### 3) Blood Pressure

The format that i will receive is
{
"systolic": {
"value": 120.0,
"unit": "mmHg"
},
"diastolic": {
"value": 80.0,
"unit": "mmHg"
},
"time": "2025-06-08T10:15:00Z",
"zoneOffset": "+00:00",
"metadata": {
"source": "Google Fit",
"device": "Pixel 7"
}
}
Blood pressure is Only a **Timestamp**, No Time Range just like BasalMetablicRateRecord
This time also we are not handling that case where we may get active calories value within two days starting in one and ending in another so no need to worry about this as it is
**Instantaneous point-in-time** and not duration based
For this i am stroing multiple bp per day in array.

###### 4)CyclingPedalingCadenceRecord

Tells us Cadence (revolutions per minute) during a cycling session over a period
