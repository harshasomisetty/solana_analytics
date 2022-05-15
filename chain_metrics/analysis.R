library(CausalImpact)
library(xts)

bpf_date <- read.csv(file = 'timedata.csv')

bpf_date$date <- as.Date(bpf_date$blockTime)

bpf_ts <- xts(bpf_date$Amount, bpf_date$date)

matplot(bpf_ts, type = "l")

hackerhouses <- as.Date(c(
    "2022-01-21",
    "2022-02-05",
    "2022-02-13",
    "2022-02-20",
    "2022-02-20",
    "2022-02-27",
    "2022-03-5",
    "2022-03-18",
    "2022-04-10",
    "2022-04-29"
    ))

start_date <- time(bpf_ts[1])
end_date <- time(tail(bpf_ts, n=1))
inter_date <- hackerhouses[length(hackerhouses)]

pre.period <- as.Date(c(start_date, inter_date))
post.period <- as.Date(c(inter_date+1, end_date))

impact <- CausalImpact(bpf_ts, pre.period, post.period)
plot(impact)
