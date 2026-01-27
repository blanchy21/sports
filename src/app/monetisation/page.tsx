'use client';

import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Calendar,
  PieChart,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/core/Button';

export default function MonetisationPage() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center space-x-3 text-3xl font-bold">
              <DollarSign className="h-8 w-8 text-primary" />
              <span>Monetisation</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Track your earnings and rewards from the Hive blockchain
            </p>
          </div>
          <Button className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span>Withdraw</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <h3 className="mt-1 text-2xl font-bold">$1,234.56</h3>
                <p className="mt-2 flex items-center text-xs text-green-500">
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                  +12.5% from last month
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <h3 className="mt-1 text-2xl font-bold">$156.78</h3>
                <p className="mt-2 flex items-center text-xs text-green-500">
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                  +8.3% growth
                </p>
              </div>
              <div className="rounded-lg bg-teal-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-teal-500" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <h3 className="mt-1 text-2xl font-bold">$89.45</h3>
                <p className="mt-2 text-xs text-muted-foreground">Available in 7 days</p>
              </div>
              <div className="rounded-lg bg-cyan-500/10 p-3">
                <Calendar className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <h3 className="mt-1 text-2xl font-bold">47</h3>
                <p className="mt-2 text-xs text-muted-foreground">23 this month</p>
              </div>
              <div className="rounded-lg bg-purple-500/10 p-3">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Earnings Chart */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center space-x-2 text-lg font-semibold">
                <PieChart className="h-5 w-5 text-primary" />
                <span>Earnings Overview</span>
              </h3>
              <select className="rounded-md border bg-background px-3 py-1.5 text-sm">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last year</option>
              </select>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Author Rewards</span>
                  <span className="font-medium">$789.23</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: '64%' }}></div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Curation Rewards</span>
                  <span className="font-medium">$345.67</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: '28%' }}></div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Beneficiary Rewards</span>
                  <span className="font-medium">$99.66</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-cyan-500" style={{ width: '8%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Posts */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-6 flex items-center space-x-2 text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Top Performing Posts</span>
            </h3>

            <div className="space-y-4">
              {[
                { title: 'The Evolution of Basketball', earnings: '$45.23', views: '2.3K' },
                { title: 'Soccer Tactics: The False 9', earnings: '$38.90', views: '1.8K' },
                { title: 'Tennis Mental Game', earnings: '$32.15', views: '1.5K' },
                { title: 'NFL Draft Analysis 2024', earnings: '$28.67', views: '1.2K' },
              ].map((post, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{post.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{post.views} views</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{post.earnings}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-6 flex items-center space-x-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-primary" />
            <span>Recent Transactions</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Post
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    date: 'Jan 15, 2024',
                    type: 'Author Reward',
                    post: 'The Evolution of Basketball',
                    amount: '+$45.23',
                    status: 'Completed',
                  },
                  {
                    date: 'Jan 14, 2024',
                    type: 'Curation Reward',
                    post: 'Soccer Tactics Analysis',
                    amount: '+$12.34',
                    status: 'Completed',
                  },
                  {
                    date: 'Jan 13, 2024',
                    type: 'Author Reward',
                    post: 'Tennis Mental Game',
                    amount: '+$32.15',
                    status: 'Completed',
                  },
                  {
                    date: 'Jan 12, 2024',
                    type: 'Beneficiary',
                    post: 'NFL Draft 2024',
                    amount: '+$8.90',
                    status: 'Pending',
                  },
                  {
                    date: 'Jan 11, 2024',
                    type: 'Author Reward',
                    post: 'MLB Season Preview',
                    amount: '+$28.67',
                    status: 'Completed',
                  },
                ].map((transaction, index) => (
                  <tr key={index} className="border-b transition-colors hover:bg-accent">
                    <td className="px-4 py-3 text-sm">{transaction.date}</td>
                    <td className="px-4 py-3 text-sm">{transaction.type}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm">{transaction.post}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-green-500">
                      {transaction.amount}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                          transaction.status === 'Completed'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hive Account Info */}
        <div className="rounded-lg bg-gradient-to-r from-primary via-teal-500 to-cyan-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="mb-2 text-lg font-semibold">Hive Account Connected</h3>
              <p className="mb-4 text-sm opacity-90">@johndoe • Reputation: 67</p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm opacity-75">HIVE Balance</p>
                  <p className="text-xl font-bold">1,234.56</p>
                </div>
                <div>
                  <p className="text-sm opacity-75">HBD Balance</p>
                  <p className="text-xl font-bold">567.89</p>
                </div>
                <div>
                  <p className="text-sm opacity-75">HP</p>
                  <p className="text-xl font-bold">5,432.10</p>
                </div>
              </div>
            </div>

            <Button variant="outline" className="bg-white text-primary hover:bg-white/90">
              View on Hive
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
